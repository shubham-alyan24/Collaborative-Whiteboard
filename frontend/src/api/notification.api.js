import { apiFetch } from "./client.js";

export const notificationApi = {
  getAll: async () => {
    return apiFetch("/notifications");
  },

  getUnreadCount: async () => {
    return apiFetch("/notifications/unread-count");
  },

  markAsRead: async (id) => {
    return apiFetch(`/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  markAllAsRead: async () => {
    return apiFetch("/notifications/read-all", {
      method: "PATCH",
    });
  },

  delete: async (id) => {
    return apiFetch(`/notifications/${id}`, {
      method: "DELETE",
    });
  },

  handleAction: async (id, action) => {
    return apiFetch(`/notifications/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },
};
