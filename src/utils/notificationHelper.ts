import Notification from "../models/Notification";

export const createNotification = async ({
  user,
  title,
  message,
  type = "system"
}: {
  user: string;
  title: string;
  message: string;
  type?: "booking" | "payment" | "system";
}) => {
  await Notification.create({
    user,
    title,
    message,
    type
  });
};
