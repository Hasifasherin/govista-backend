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
    availableDates: [
      {
        type: Date,
        required: true
      }
    ],
    image: {
      type: String // will hold Cloudinary URL
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Tour", tourSchema);
