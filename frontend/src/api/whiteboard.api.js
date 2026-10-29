import { apiFetch } from "./client.js";

export const whiteboardApi = {
  getAll: async () => {
    return apiFetch("/whiteboards");
  },

  getOne: async (id) => {
    return apiFetch(`/whiteboards/${id}`);
  },

  create: async (name = "Untitled") => {
    return apiFetch("/whiteboards", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  update: async (id, data) => {
    return apiFetch(`/whiteboards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  remove: async (id) => {
    return apiFetch(`/whiteboards/${id}`, {
      method: "DELETE",
    });
  },

  joinByCode: async (code) => {
    return apiFetch(`/whiteboards/join/${code}`);
  },

  requestAccess: async (id) => {
    return apiFetch(`/whiteboards/${id}/request-access`, {
      method: "POST",
    });
  },

  respondToRequest: async (id, requestId, approve) => {
    return apiFetch(`/whiteboards/${id}/respond-request`, {
      method: "POST",
      body: JSON.stringify({ requestId, approve }),
    });
  },

  uploadImage: async (id, file) => {
    const formData = new FormData();
    formData.append("image", file);
    return apiFetch(`/whiteboards/${id}/upload-image`, {
      method: "POST",
      body: formData,
    });
  },

  uploadThumbnail: async (id, blob) => {
    const formData = new FormData();
    formData.append("thumbnail", blob, "thumbnail.png");
    return apiFetch(`/whiteboards/${id}/thumbnail`, {
      method: "POST",
      body: formData,
    });
  },
};
