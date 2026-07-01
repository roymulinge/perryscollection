// src/api/auth.js
// All authentication-related API calls live here.
// Keeping API calls in dedicated files (not inside components) is
// called the "service layer" pattern — makes testing and changes easier.

import apiClient from "./client";

/**
 * Register a new user.
 * @param {Object} data - { email, full_name, password, password2 }
 * @returns {{ user, access, refresh }}
 */
export async function register(data) {
  const response = await apiClient.post("/auth/register/", data);
  return response.data;
  // response.data is what Django returned: { user: {...}, access: "...", refresh: "..." }
}

/**
 * Log in with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {{ user, access, refresh }}
 */
export async function login(email, password) {
  const response = await apiClient.post("/auth/login/", { email, password });
  return response.data;
}

/**
 * Get the currently logged-in user's profile.
 * Requires a valid access token (apiClient attaches it automatically).
 * @returns {Object} user
 */
export async function getMe() {
  const response = await apiClient.get("/auth/me/");
  return response.data;
}

/**
 * Log out locally — just remove tokens.
 * We don't call the backend because JWTs are stateless;
 * removing them from localStorage is sufficient.
 */
export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function getProfile(){
  const response = await apiClient.get("/auth/profile/");
  return response.data;
}

export async function updateProfile(data){
  const response = await apiClient.patch("/auth/profile/", data);
  return response.data;
}