import axios from 'axios';

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Simple in-memory request deduplication ──────────────────────
// Prevents duplicate simultaneous GET requests to the same URL.
// Useful when multiple components mount at the same time and each
// independently calls the same endpoint (e.g. unread-count polling).
const pendingRequests = new Map();

export function deduplicatedGet(url, config = {}) {
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url);
  }
  const promise = api.get(url, config).finally(() => {
    pendingRequests.delete(url);
  });
  pendingRequests.set(url, promise);
  return promise;
}

// ── Blob URL cache for authenticated images ──────────────────────
// Prevents re-fetching the same image file on every render.
// URLs are keyed by file path and revoked when the cache is cleared.
const blobUrlCache = new Map();

export async function getAuthenticatedBlobUrl(fileUrl) {
  if (blobUrlCache.has(fileUrl)) {
    return blobUrlCache.get(fileUrl);
  }
  const response = await api.get(fileUrl, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(new Blob([response.data]));
  blobUrlCache.set(fileUrl, blobUrl);
  return blobUrl;
}

export function revokeBlobUrl(fileUrl) {
  const blobUrl = blobUrlCache.get(fileUrl);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrlCache.delete(fileUrl);
  }
}

export default api;
