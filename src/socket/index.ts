import { Server, Socket } from "socket.io";
import http from "http";
import mongoose from "mongoose";
import MessageModel from "../models/Message";
import User from "../models/User";

/* =========================
   Socket Payload Types
========================= */

interface ServerToClientEvents {
  newMessage: (message: any) => void;
  adminNewMessage: (message: any) => void;
  messagesRead: (data: { bookingId?: string; senderId?: string; readerId: string; count: number }) => void;
}

interface ClientToServerEvents {
  joinChat: (payload: { bookingId?: string; otherUserId?: string }) => void;
  joinAdminBooking: (payload: { bookingId: string }) => void;
  joinAdminGlobal: () => void;
  sendMessage: (payload: {
    senderId: string;
    receiverId: string;
    bookingId?: string;
    tourId?: string;
    message: string;
  }) => void;
  markRead: (payload: { bookingId?: string; otherUserId?: string; readerId: string }) => void;
}

interface InterServerEvents {}
interface SocketData { userId?: string }

/* =========================
   Init Socket
========================= */

export const initSocket = (server: http.Server) => {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >({
    cors: { origin: "*", credentials: true },
  });

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log("🔌 Socket connected:", socket.id);

    /* =========================
       Join Chat (Booking or Pre-booking)
    ========================== */
    socket.on("joinChat", ({ bookingId, otherUserId }) => {
      if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
        socket.join(`booking-chat-${bookingId}`);
      } else if (otherUserId && mongoose.Types.ObjectId.isValid(otherUserId)) {
        // Pre-booking user-to-user chat room
        socket.join(`user-chat-${otherUserId}`);
      }
    });

    /* =========================
       Admin → Watch Booking
    ========================== */
    socket.on("joinAdminBooking", ({ bookingId }) => {
      if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return;
      socket.join(`admin-booking-${bookingId}`);
    });

    /* =========================
       Admin → Watch All
    ========================== */
    socket.on("joinAdminGlobal", () => {
      socket.join("admin-global");
    });

    /* =========================
       Send Message
    ========================== */
    socket.on("sendMessage", async ({ senderId, receiverId, bookingId, tourId, message }) => {
      try {
        if (
          !message?.trim() ||
          !mongoose.Types.ObjectId.isValid(senderId) ||
          !mongoose.Types.ObjectId.isValid(receiverId) ||
          (bookingId && !mongoose.Types.ObjectId.isValid(bookingId)) ||
          (tourId && !mongoose.Types.ObjectId.isValid(tourId))
        ) return;

        const newMessage = await MessageModel.create({
          sender: senderId,
          receiver: receiverId,
          bookingId: bookingId || null,
          tourId: tourId || null,
          message,
          messageType: "text",
          read: false,
        });

        const populatedMessage = await MessageModel.findById(newMessage._id)
          .populate("sender", "firstName lastName email role")
          .populate("receiver", "firstName lastName email role")
          .populate("bookingId", "status travelDate")
          .populate("tourId", "title location");

        if (!populatedMessage) return;

        // Emit events
        if (bookingId) {
          io.to(`booking-chat-${bookingId}`).emit("newMessage", populatedMessage);
          io.to(`admin-booking-${bookingId}`).emit("adminNewMessage", populatedMessage);
        } else {
          // Pre-booking chat room
          io.to(`user-chat-${receiverId}`).emit("newMessage", populatedMessage);
        }

        io.to("admin-global").emit("adminNewMessage", populatedMessage);

      } catch (err) {
        console.error("Socket sendMessage error:", err);
      }
    });

    /* =========================
       Mark Messages Read
    ========================== */
    socket.on("markRead", async ({ bookingId, otherUserId, readerId }) => {
      try {
        const filter: any = { receiver: readerId, read: false };
        let roomId: string | null = null;

        if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
          filter.bookingId = bookingId;
          roomId = `booking-chat-${bookingId}`;
        } else if (otherUserId && mongoose.Types.ObjectId.isValid(otherUserId)) {
          filter.sender = otherUserId;
          roomId = `user-chat-${otherUserId}`;
        }

        const result = await MessageModel.updateMany(filter, { $set: { read: true } });

        if (roomId) {
          io.to(roomId).emit("messagesRead", {
            bookingId,
            senderId: otherUserId,
            readerId,
            count: result.modifiedCount,
          });
        }

      } catch (err) {
        console.error("Socket markRead error:", err);
      }
    });

    /* =========================
       Disconnect
    ========================== */
    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  return io;
};
