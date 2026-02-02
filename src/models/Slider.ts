import mongoose, { Schema, Document } from "mongoose";

export interface ISlider extends Document {
  imageUrl: string;
  imagePublicId: string;
  createdBy: string;   // ✅ FIX HERE
  createdAt: Date;
  updatedAt: Date;
}

const sliderSchema = new Schema<ISlider>(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    imagePublicId: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,     // ✅ matches interface
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISlider>("Slider", sliderSchema);
