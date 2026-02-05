import { Server, Socket } from "socket.io";
import http from "http";
import Message from "../models/Message";

/* =========================
   Socket Payload Types
========================= */

interface JoinChatPayload {
  operatorId: string;
  userId: string;
}

interface SendMessagePayload {
  senderId: string;
  receiverId: string;
  operatorId: string;
  userId: string;
  message: string;
}

interface MarkReadPayload {
  senderId: string;
  receiverId: string;
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
       Join User ↔ Operator Chat
    ========================== */
    socket.on(
      "joinChat",
      ({ operatorId, userId }: JoinChatPayload) => {
        const room = `chat-${operatorId}-${userId}`;
        socket.join(room);
      }
    );

    /* =========================
       Admin → Watch Operator
    ========================== */
    socket.on(
      "joinAdminOperator",
      ({ operatorId }: { operatorId: string }) => {
        socket.join(`admin-operator-${operatorId}`);
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
        operatorId,
        userId,
        message,
      }: SendMessagePayload) => {
        const newMessage = await Message.create({
          sender: senderId,
          receiver: receiverId,
          message,
          read: false,
        });

        const payload = {
          _id: newMessage._id,
          sender: senderId,
          receiver: receiverId,
          message,
          createdAt: newMessage.createdAt,
        };

        // Chat room
        io.to(`chat-${operatorId}-${userId}`).emit(
          "newMessage",
          payload
        );

        // Admin operator monitor
        io.to(`admin-operator-${operatorId}`).emit(
          "adminNewMessage",
          payload
        );

        // Global admin
        io.to("admin-global").emit(
          "adminNewMessage",
          payload
        );
      }
    );

    /* =========================
       Mark Messages Read
    ========================== */
    socket.on(
      "markRead",
      async ({ senderId, receiverId }: MarkReadPayload) => {
        await Message.updateMany(
          { sender: senderId, receiver: receiverId, read: false },
          { $set: { read: true } }
        );

        io.emit("messagesRead", {
          senderId,
          receiverId,
        });
      }
    );

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  return io;
};
