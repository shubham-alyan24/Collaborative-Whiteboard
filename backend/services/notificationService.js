import Notification from "../models/Notification.js";
import mongoose from "mongoose";

export const createNotification = async ({
  recipient,
  sender,
  board,
  type,
  message,
  actionData = {},
}) => {
  return await Notification.create({
    recipient,
    sender,
    board,
    type,
    message,
    actionData,
  });
};
export const getNotificationById = async (notificationId, userId) => {
  return await Notification.findOne({
    _id: new mongoose.Types.ObjectId(notificationId),
    recipient: new mongoose.Types.ObjectId(userId),
  }).populate("board", "name");
};
export const getNotificationsForUser = async (
  userId,
  { limit = 50, includeRead = false } = {},
) => {
  const query = { recipient: new mongoose.Types.ObjectId(userId) };

  if (!includeRead) {
    query.isRead = false;
  }

  return await Notification.find(query)
    .populate("sender", "name email")
    .populate("board", "name")
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const getAllNotificationsForUser = async (userId, limit = 50) => {
  return await Notification.find({
    recipient: new mongoose.Types.ObjectId(userId),
  })
    .populate("sender", "name email")
    .populate("board", "name")
    .sort({ createdAt: -1 })
    .limit(limit);
};

export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: new mongoose.Types.ObjectId(userId) },
    { isRead: true },
    { returnDocument: "after" },
  );
  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification;
};

export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: new mongoose.Types.ObjectId(userId), isRead: false },
    { isRead: true },
  );

  return result;
};

export const deleteNotification = async (notificationId, userId) => {
  const result = await Notification.deleteOne({
    _id: notificationId,
    recipient: new mongoose.Types.ObjectId(userId),
  });

  if (result.deletedCount === 0) {
    throw new Error("Notification not found");
  }

  return result;
};

export const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({
    recipient: new mongoose.Types.ObjectId(userId),
    isRead: false,
  });
};

export const deleteOldNotifications = async (userId, daysOld = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return await Notification.deleteMany({
    recipient: new mongoose.Types.ObjectId(userId),
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });
};
