import * as notificationService from "../services/notificationService.js";
import catchAsync from "../utils/catchAsync.js";
import ApiError from "../utils/ApiError.js";
import { respondToRequest } from "./whiteboardController.js";

export const getNotifications = catchAsync(async (req, res) => {
  const { includeRead } = req.query;
  const notifications = await notificationService.getAllNotificationsForUser(
    req.user.id,
    50,
  );

  res.json(notifications);
});

export const getUnreadCount = catchAsync(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  res.json({ count });
});

export const markNotificationAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const notification = await notificationService.markAsRead(id, req.user.id);
  res.json(notification);
});

export const markAllNotificationsAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.json({ message: "All notifications marked as read" });
});

export const deleteNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  await notificationService.deleteNotification(id, req.user.id);
  res.json({ message: "Notification deleted" });
});

export const handleNotificationAction = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  const notification = await notificationService.getNotificationById(
    id,
    req.user.id,
  );
  if (!notification) {
    throw ApiError.notFound("Notification not found");
  }

  if (notification.type !== "request_received") {
    throw ApiError.badRequest(
      "Action not available for this notification type",
    );
  }

  const approve = action === "accept";

  const mockReq = {
    params: { id: notification.board._id.toString() },
    body: { requestId: notification.actionData.requestId, approve },
    user: req.user,
  };

  const mockRes = {
    json: (data) => data,
  };

  await respondToRequest(mockReq, mockRes);

  await notificationService.deleteNotification(id, req.user.id);

  res.json({
    message: approve ? "Request approved" : "Request denied",
    action: approve ? "accepted" : "rejected",
  });
});
