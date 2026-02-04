import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    tourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    travelDate: {
      type: Date,
      required: true
    },

    participants: {
      type: Number,
      required: true,
      min: 1
    },

    priceAtBooking: {
      type: Number,
      required: true
    },

    totalPrice: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "completed"],
      default: "pending"
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid"
    },

    amountPaid: {
      type: Number,
      default: 0
    },

    stripePaymentIntentId: {
      type: String
    }
  },
  { timestamps: true }
);

// ✅ Indexes
bookingSchema.index({ tourId: 1, travelDate: 1 });
bookingSchema.index({ operatorId: 1, travelDate: 1 });
bookingSchema.index({ userId: 1 });
bookingSchema.index({ status: 1 });

export default mongoose.model("Booking", bookingSchema);
