import Notification from "../models/Notification";

export const createNotification = async ({
  user,
  title,
  message,
  type = "system",
  metadata = {},
}: {
  user: string;
  title: string;
  message: string;
  type?: "booking" | "payment" | "system";
  metadata?: Record<string, any>;
}) => {
  await Notification.create({
    user,
    title,
    message,
    type,
    metadata,
  });
};
