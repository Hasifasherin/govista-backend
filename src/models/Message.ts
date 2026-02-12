import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Main message content
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Message status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 🔑 Booking-aware chat (OPTIONAL)
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },

    // Optional but very useful for context
    tourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      default: null,
    },
    // Soft delete
isDeleted: {
  type: Boolean,
  default: false,
},

deletedAt: {
  type: Date,
  default: null,
},


    // Text vs system messages
    messageType: {
      type: String,
      enum: ["text", "system"],
      default: "text",
    },

    // Soft-archive per user (operator inbox cleanup)
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ]
  },
  { timestamps: true }
);

// ================= Indexes =================

// Conversation queries
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

// Booking-specific chat
messageSchema.index({ bookingId: 1, createdAt: 1 });

// Unread messages
messageSchema.index({ receiver: 1, read: 1 });



export default mongoose.model("Message", messageSchema);
