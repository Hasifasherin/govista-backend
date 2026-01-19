import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import Booking from "../models/Booking";
import { createNotification } from "../utils/notificationHelper";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

// Create Payment Intent
export const createPaymentIntent = async (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }

    const booking = await Booking.findById(bookingId).populate("tourId");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ success: false, message: "Booking cannot be paid" });
    }

    const amount = (booking.tourId as any).price * 100; // convert to cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: { bookingId: booking._id.toString() },
    });

    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    next(error);
  }
};

// Stripe Webhook
export const stripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) return res.status(400).send("Webhook error");

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig as string,
        endpointSecret as string
      );
    } catch (err: any) {
      console.log(err);
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata.bookingId;

      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.status = "accepted";
        await booking.save();

        // ✅ Corrected notification call
        await createNotification({
          user: booking.userId.toString(),
          title: "Booking Confirmed",
          message: `Your booking for "${(booking.tourId as any).title}" has been confirmed!`,
          type: "payment",
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};
