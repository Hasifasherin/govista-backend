import mongoose from "mongoose";

const tourSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    maxGroupSize: {
      type: Number,
      required: true
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    availableDates: [
      {
        type: Date,
        required: true
      }
    ],
    image: {
      type: String
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    averageRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending" 
    },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Tour", tourSchema);