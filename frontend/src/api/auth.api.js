import { apiFetch } from './client.js';

export const authApi = {
  login: async (email, password) => {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (name, email, password) => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  forgotPassword: async (email) => {
    return apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token, password) => {
    return apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  getMe: async () => {
    return apiFetch('/auth/me');
  },

  // body: FormData (with avatar) or { name, email }
  updateProfile: async (body) => {
    return apiFetch('/auth/me', {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  changePassword: async (currentPassword, newPassword) => {
    return apiFetch('/auth/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  deleteAccount: async () => {
    return apiFetch('/auth/me', { method: 'DELETE' });
  },

  // Full-page redirect target that starts the Google/GitHub OAuth flow
  oauthUrl: (provider) =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/${provider}`,
};