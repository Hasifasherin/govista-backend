import mongoose, { Document } from "mongoose";
import slugify from "slugify";

// Category document interface
export interface ICategory extends Document {
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new mongoose.Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ✅ Pre-save hook: no SaveOptions error
categorySchema.pre("save", function (this: ICategory) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

export default mongoose.model<ICategory>("Category", categorySchema);
