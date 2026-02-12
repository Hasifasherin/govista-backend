import { Server, Socket } from "socket.io";
import http from "http";
import Message from "../models/Message";

/* =========================
   Socket Payload Types
========================= */

interface JoinChatPayload {
  bookingId: string;
}

interface SendMessagePayload {
  senderId: string;
  receiverId: string;
  bookingId: string;
  tourId?: string;
  message: string;
}

interface MarkReadPayload {
  bookingId: string;
  readerId: string;
}

/* =========================
   Init Socket
========================= */

export const initSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("🔌 Socket connected:", socket.id);

    /* =========================
       Join Booking Chat
       (User ↔ Operator)
    ========================== */
    socket.on("joinChat", ({ bookingId }: JoinChatPayload) => {
      socket.join(`booking-chat-${bookingId}`);
    });

    /* =========================
       Admin → Watch Booking
    ========================== */
    socket.on(
      "joinAdminBooking",
      ({ bookingId }: { bookingId: string }) => {
        socket.join(`admin-booking-${bookingId}`);
      }
    );

    /* =========================
       Admin → Watch All
    ========================== */
    socket.on("joinAdminGlobal", () => {
      socket.join("admin-global");
    });

    /* =========================
       Send Message
    ========================== */
    socket.on(
      "sendMessage",
      async ({
        senderId,
        receiverId,
        bookingId,
        tourId,
        message,
      }: SendMessagePayload) => {
        if (!message?.trim()) return;

        const newMessage = await Message.create({
          sender: senderId,
          receiver: receiverId,
          bookingId,
          tourId,
          message,
          messageType: "text",
          read: false,
        });

        const payload = {
          _id: newMessage._id,
          sender: senderId,
          receiver: receiverId,
          bookingId,
          message,
          createdAt: newMessage.createdAt,
        };

        // Booking chat room
        io.to(`booking-chat-${bookingId}`).emit("newMessage", payload);

        // Admin booking monitor
        io.to(`admin-booking-${bookingId}`).emit(
          "adminNewMessage",
          payload
        );

        // Global admin
        io.to("admin-global").emit("adminNewMessage", payload);
      }
    );

    /* =========================
       Mark Messages Read
    ========================== */
    socket.on(
      "markRead",
      async ({ bookingId, readerId }: MarkReadPayload) => {
        await Message.updateMany(
          {
            bookingId,
            receiver: readerId,
            read: false,
          },
          { $set: { read: true } }
        );

        // Notify only booking room
        io.to(`booking-chat-${bookingId}`).emit(
          "messagesRead",
          {
            bookingId,
            readerId,
          }
        );
      }
    );

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  return io;
};
