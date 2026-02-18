import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// 1️⃣ Create IUser interface with all fields + custom methods
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: "male" | "female";
  dob: Date;
  password: string;
  role: "user" | "operator" | "admin";
  wishlist: mongoose.Types.ObjectId[];
  isBlocked: boolean;
  isApproved: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  createPasswordResetToken: () => string;
}

// 2️⃣ Schema definition
const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    dob: { type: Date, required: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "operator", "admin"], default: "user" },
    wishlist: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Tour",
      default: [],
    },

    isBlocked: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

// 3️⃣ Hash password before saving
userSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// 4️⃣ Forgot Password Token Method
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken;
};

//  Export model
export default mongoose.model<IUser>("User", userSchema);
