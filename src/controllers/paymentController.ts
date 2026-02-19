import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import Booking from "../models/Booking";
import { createNotification } from "../utils/notificationHelper";

// -------------------------
// Stripe initialization
// -------------------------
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not defined. Payments won't work.");
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;


// -------------------------
// CREATE PAYMENT INTENT
// -------------------------
export const createPaymentIntent = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: "Payment system is temporarily unavailable",
      });
    }

    const { bookingId } = req.body;
    if (!bookingId) {
      return res
        .status(400)
        .json({ success: false, message: "bookingId is required" });
    }

    const booking = await Booking.findById(bookingId).populate(
      "tourId",
      "title"
    );

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // Ownership check
    if (booking.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized" });
    }

    // Already paid
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Booking already paid",
      });
    }

    // Must be accepted
    if (booking.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Booking must be accepted before payment",
      });
    }

    // -------------------------
    // Prevent duplicate intents
    // -------------------------
    if (booking.stripePaymentIntentId) {
      const existingIntent =
        await stripe.paymentIntents.retrieve(
          booking.stripePaymentIntentId
        );

      return res.json({
        success: true,
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id,
      });
    }

    const amount = Math.round(booking.totalPrice * 100);

    const paymentIntent =
      await stripe.paymentIntents.create({
        amount,
        currency:
          process.env.STRIPE_CURRENCY || "usd",
        metadata: {
          bookingId: booking._id.toString(),
          userId: req.user.id,
          tourTitle:
            (booking.tourId as any)?.title ||
            "Unknown Tour",
        },
        receipt_email: req.user.email,
        automatic_payment_methods: {
          enabled: true,
        },
        description: `Booking payment for ${
          (booking.tourId as any)?.title ||
          "tour"
        }`,
      });

    // Save intent ID
    booking.stripePaymentIntentId =
      paymentIntent.id;
    await booking.save();

    res.json({
      success: true,
      clientSecret:
        paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error(
      "Payment intent creation error:",
      error
    );
    next(error);
  }
};

// -------------------------
// CONFIRM PAYMENT
// -------------------------
export const confirmPayment = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: "Payment system unavailable",
      });
    }

    const { bookingId } = req.params;

    const booking = await Booking.findById(
      bookingId
    ).populate("tourId", "title");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Ownership check
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!booking.stripePaymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "No payment intent found",
      });
    }

    const paymentIntent =
      await stripe.paymentIntents.retrieve(
        booking.stripePaymentIntentId
      );

    // -------------------------
    // SUCCESS CASE
    // -------------------------
    if (
      paymentIntent.status ===
        "succeeded" &&
      paymentIntent.amount_received ===
        booking.totalPrice * 100
    ) {
      booking.paymentStatus = "paid";
      booking.amountPaid =
        paymentIntent.amount_received / 100;

      // Optional charge save
      booking.stripeChargeId =
        paymentIntent.latest_charge as string;

      await booking.save();

      await createNotification({
        user: booking.userId.toString(),
        title: "Booking Confirmed",
        message: `Your booking for "${
          (booking.tourId as any)?.title
        }" has been confirmed!`,
        type: "payment",
        metadata: {
          bookingId: booking._id,
        },
      });

      return res.json({
        success: true,
        status: "paid",
        booking,
      });
    }

    // -------------------------
    // FAILED CASE
    // -------------------------
    if (
      paymentIntent.status ===
      "requires_payment_method"
    ) {
      booking.paymentStatus = "failed";
      await booking.save();

      return res.json({
        success: false,
        status: "failed",
        message:
          "Payment failed. Please try again.",
      });
    }

    // -------------------------
    // OTHER STATUSES
    // -------------------------
    return res.json({
      success: true,
      status: paymentIntent.status,
      booking,
    });
  } catch (error) {
    console.error(
      "Payment confirmation error:",
      error
    );
    next(error);
  }
};

// -------------------------
// CHECK PAYMENT STATUS
// -------------------------
export const checkPaymentStatus = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId } = req.params;

    const booking =
      await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (booking.paymentStatus === "paid") {
      return res.json({
        success: true,
        status: "paid",
        booking,
      });
    }

    if (
      booking.stripePaymentIntentId &&
      stripe
    ) {
      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          booking.stripePaymentIntentId
        );

      return res.json({
        success: true,
        status: paymentIntent.status,
        booking,
      });
    }

    return res.json({
      success: true,
      status: booking.paymentStatus,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------
// CREATE REFUND
// -------------------------
export const createRefund = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: "Payment system unavailable",
      });
    }

    const { bookingId, reason } = req.body;

    const booking =
      await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Role check
    if (
      req.user.role !== "admin" &&
      req.user.role !== "operator"
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      booking.paymentStatus !== "paid" ||
      !booking.stripePaymentIntentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Booking not paid or no payment intent",
      });
    }

    const refund =
      await stripe.refunds.create({
        payment_intent:
          booking.stripePaymentIntentId,
        reason:
          reason ||
          "requested_by_customer",
      });

    booking.paymentStatus = "refunded";
    booking.status = "cancelled";
    await booking.save();

    await createNotification({
      user: booking.userId.toString(),
      title: "Refund Initiated",
      message:
        "A refund has been initiated for your booking.",
      type: "payment",
      metadata: {
        bookingId: booking._id,
      },
    });

    res.json({
      success: true,
      refund,
      booking,
    });
  } catch (error) {
    console.error(
      "Refund creation error:",
      error
    );
    next(error);
  }
};
