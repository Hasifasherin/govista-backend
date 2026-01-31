import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import Booking from "../models/Booking";
import { createNotification } from "../utils/notificationHelper";

// ✅ ADDED: Environment validation
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not defined in environment variables");
  console.warn("Payment features will not work without Stripe configuration");
}

// ✅ ADDED: Conditional Stripe initialization
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
    // ✅ ADDED: Check if Stripe is configured
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: "Payment system is temporarily unavailable"
      });
    }

    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ 
        success: false, 
        message: "bookingId is required" 
      });
    }

    const booking = await Booking.findById(bookingId).populate("tourId", "title");

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    // Ownership check
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ 
        success: false, 
        message: "Booking cannot be paid" 
      });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ 
        success: false, 
        message: "Booking already paid" 
      });
    }

    const amount = Math.round(booking.totalPrice * 100); // ✅ ADDED: Math.round for cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: process.env.STRIPE_CURRENCY || "usd", // ✅ ADDED: Configurable currency
      metadata: {
        bookingId: booking._id.toString(),
        userId: req.user.id,
        tourTitle: (booking.tourId as any)?.title || "Unknown Tour"
      },
      receipt_email: req.user.email,
      automatic_payment_methods: { enabled: true },
      description: `Booking payment for ${(booking.tourId as any)?.title || "tour"}`
    });

    // ✅ ADDED: Save payment intent ID to booking
    booking.stripePaymentIntentId = paymentIntent.id;
    await booking.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id // ✅ ADDED: For frontend reference
    });
  } catch (error) {
    console.error("Payment intent creation error:", error);
    next(error);
  }
};

// -------------------------
// STRIPE WEBHOOK
// -------------------------
export const stripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ✅ ADDED: Check if Stripe is configured
    if (!stripe) {
      console.error("Stripe not configured for webhook");
      return res.status(503).send("Payment system unavailable");
    }

    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
      console.error("Missing Stripe signature or webhook secret");
      return res.status(400).send("Webhook Error: Missing configuration");
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig as string,
        endpointSecret
      );
    } catch (err: any) {
      console.error("Stripe Webhook Signature Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Stripe Webhook Received: ${event.type}`);

    // Payment Success
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata.bookingId;

      if (!bookingId) {
        console.error("No bookingId in payment intent metadata");
        return res.json({ received: true });
      }

      const booking = await Booking.findById(bookingId).populate("tourId", "title");

      if (!booking) {
        console.error(`Booking ${bookingId} not found for payment`);
        return res.json({ received: true });
      }

      if (booking.paymentStatus !== "paid") {
        booking.status = "accepted";
        booking.paymentStatus = "paid";
        booking.amountPaid = paymentIntent.amount_received / 100;
        booking.stripePaymentIntentId = paymentIntent.id;
        await booking.save();

        const tourTitle = (booking.tourId as any)?.title || "your tour";

        await createNotification({
          user: booking.userId.toString(),
          title: "Booking Confirmed",
          message: `Your booking for "${tourTitle}" has been confirmed!`,
          type: "payment",
          metadata: { 
            bookingId: booking._id,
            tourId: booking.tourId 
          }
        });

        console.log(`Booking ${bookingId} marked as paid`);
      }
    }

    // ✅ ADDED: Handle payment failure
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata.bookingId;
      
      console.log(`Payment failed for intent: ${paymentIntent.id}, booking: ${bookingId}`);
      
      if (bookingId) {
        const booking = await Booking.findById(bookingId);
        if (booking && booking.paymentStatus === "unpaid") {
          await createNotification({
            user: booking.userId.toString(),
            title: "Payment Failed",
            message: "Your payment was not successful. Please try again.",
            type: "payment",
            metadata: { bookingId: booking._id }
          });
        }
      }
    }

    // ✅ ADDED: Handle refunds
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;
      
      console.log(`Refund processed for payment intent: ${paymentIntentId}`);
      
      // Find booking by payment intent ID
      const booking = await Booking.findOne({ stripePaymentIntentId: paymentIntentId });
      if (booking) {
        booking.paymentStatus = "refunded";
        booking.status = "cancelled";
        await booking.save();
        
        await createNotification({
          user: booking.userId.toString(),
          title: "Refund Processed",
          message: "Your refund has been processed successfully.",
          type: "payment",
          metadata: { bookingId: booking._id }
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    next(error);
  }
};

// ✅ ADDED: CHECK PAYMENT STATUS
export const checkPaymentStatus = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Ownership check
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // If payment is already marked as paid in our DB
    if (booking.paymentStatus === "paid") {
      return res.json({
        success: true,
        status: "paid",
        booking
      });
    }

    // Check with Stripe if we have a payment intent
    if (booking.stripePaymentIntentId && stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          booking.stripePaymentIntentId
        );

        return res.json({
          success: true,
          status: paymentIntent.status,
          stripeStatus: paymentIntent.status,
          booking
        });
      } catch (stripeError) {
        // Intent not found or other Stripe error
        console.error("Stripe retrieval error:", stripeError);
      }
    }

    res.json({
      success: true,
      status: booking.paymentStatus,
      booking
    });
  } catch (error) {
    next(error);
  }
};

// ✅ ADDED: CREATE REFUND (Admin/Operator only)
export const createRefund = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    // ✅ ADDED: Check if Stripe is configured
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: "Payment system is temporarily unavailable"
      });
    }

    const { bookingId, reason } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Only admin or operator can refund
    if (req.user.role !== "admin" && req.user.role !== "operator") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (booking.paymentStatus !== "paid" || !booking.stripePaymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Booking not paid or no payment intent"
      });
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
      reason: reason || "requested_by_customer"
    });

    // Update booking
    booking.paymentStatus = "refunded";
    booking.status = "cancelled";
    await booking.save();

    // Notify user
    await createNotification({
      user: booking.userId.toString(),
      title: "Refund Initiated",
      message: `A refund has been initiated for your booking.`,
      type: "payment",
      metadata: { bookingId: booking._id }
    });

    res.json({
      success: true,
      refund,
      booking
    });
  } catch (error) {
    console.error("Refund creation error:", error);
    next(error);
  }
};