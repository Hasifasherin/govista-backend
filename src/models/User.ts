import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // 👤 Basic Info
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    phone: {
      type: String,
      required: true
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: true
    },

    dob: {
      type: Date,
      required: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["user", "operator", "admin"],
      default: "user"
    },

    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tour" }],

    // Admin-related flags (UNCHANGED)
    isBlocked: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

//  Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model("User", userSchema);
