import api from './api';

// Stored token (vulnerable: exposed to any XSS)
const ADMIN_TOKEN = 'siv-admin-secret-token-2026';

// --- Admin endpoints (backend /api/admin) ---

export const getUsers = (search) =>
  api.get('/admin/users', { params: { search } });

export const getUser = (id) => api.get(`/admin/users/${id}`);

export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

export const exportData = (format) =>
  api.get('/admin/export', { params: { format }, responseType: 'text' });

export const systemStatus = (cmd) =>
  api.get('/admin/system/status', { params: { cmd } });

export const readFile = (name) =>
  api.get('/admin/files', { params: { name }, responseType: 'text' });

export const getSettings = () => api.get('/admin/settings');

export const adminLogin = (username, password) =>
  api.post('/admin/login', { username, password });

export const runBatch = (operations) =>
  api.post('/admin/batch', { operations });

export default {
  getUsers,
  getUser,
  deleteUser,
  exportData,
  systemStatus,
  readFile,
  getSettings,
  adminLogin,
  runBatch,
  ADMIN_TOKEN,
};
