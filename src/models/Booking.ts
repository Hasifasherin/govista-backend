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
        bookingDate: {
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
            required: true, 
        },

        status: {
            type: String,
            enum: ["pending", "accepted", "rejected", "cancelled"],
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

export default mongoose.model("Booking", bookingSchema);
