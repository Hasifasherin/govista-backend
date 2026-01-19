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

        status: {
            type: String,
            enum: ["pending", "accepted", "rejected", "cancelled"],
            default: "pending"
        }
    },
    { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
