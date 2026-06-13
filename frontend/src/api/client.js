// src/api/client.js
// This is the SINGLE axios instance used everywhere in your app.
// By configuring it once here, every API call gets the auth header automatically.

import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
  // baseURL: the root URL prepended to every request
  // import.meta.env.VITE_* reads from your .env file
  // || fallback: if no .env, use localhost during development
  headers: {
    "Content-type": "application/json",
  },
  //withCredentials: true tells the browser to include cookies in CORS-ORIGIN requests.
});

// ── REQUEST INTERCEPTOR ──
// Interceptors run before every request is sent.
// This one attaches the JWT access token to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  // localStorage persists across page refreshes — that's why we use it for tokens

  if (token) {
    // The Authorization header is how the backend identifies you
    // Django simplejwt reads "Bearer <token>" and populates request.user
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config; // must return config or the request won't be sent
});

// ── RESPONSE INTERCEPTOR ──
// This runs on every response. If we get a 401 (Unauthorized),
// it means the access token expired. We try to get a new one
// using the refresh token — this is called "silent refresh".
apiClient.interceptors.response.use(
  (response) => response, // success: just pass it through

  async (error) => {
    const originalRequest = error.config;

    // 401 = Unauthorized, and _retry flag prevents infinite loop
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // mark so we don't retry again

      try {
        const refresh = localStorage.getItem("refresh_token");

        if (!refresh) {
          // No refresh token — user needs to log in again
          localStorage.removeItem("access_token");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Ask Django for a new access token using our refresh token
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/auth/token/refresh/`,
          { refresh }
        );

        const newAccess = response.data.access;
        localStorage.setItem("access_token", newAccess);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        // Refresh token itself expired — force logout
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