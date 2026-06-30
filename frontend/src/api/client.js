// src/api/client.js
// Single axios instance used everywhere in the app.
// Auth header and token refresh are handled here automatically.

import axios from "axios";

const apiClient = axios.create({
  // ── IMPORTANT: use localhost, NOT 127.0.0.1 ──────────────────────────────
  // Your Django CORS_ALLOWED_ORIGINS lists localhost:5173 and localhost:5174.
  // If this baseURL says 127.0.0.1, the browser sees a DIFFERENT origin
  // even though it's the same machine. The session cookie Django sets gets
  // silently dropped on every request → cart always appears empty.
  // Pick one (localhost) and use it everywhere — both here and in Django.
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
  // withCredentials: true tells the browser to include cookies (including
  // the Django sessionid cookie) in every cross-origin request.
  // This is what keeps the session alive between calls.
  // It only works if Django also sends back:
  //   Access-Control-Allow-Credentials: true  ← CORS_ALLOW_CREDENTIALS = True
  //   Access-Control-Allow-Origin: http://localhost:5173  ← exact origin, not *
  withCredentials: true,
});

// ── REQUEST INTERCEPTOR ───────────────────────────────────────────────────────
// Attaches the JWT access token to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────────────────────
// If we get a 401 (access token expired), silently refresh it and retry.
apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh = localStorage.getItem("refresh_token");

        if (!refresh) {
          localStorage.removeItem("access_token");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Use a plain axios call here (not apiClient) to avoid
        // triggering the interceptor again in an infinite loop.
        const response = await axios.post(
          "http://localhost:8000/api/auth/token/refresh/",
          { refresh },
          { withCredentials: true }
        );

        const newAccess = response.data.access;
        localStorage.setItem("access_token", newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;