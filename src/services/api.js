import axios from "axios";
import { clearAuthSession } from "./authStorage";

// Support both variable names used in local and hosted environments.
const apiBaseUrl =
  import.meta.env.VITE_API_URL
  
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  // Keep false for JWT; only set to true if using Laravel Sanctum Cookies
  withCredentials: false, 
});

// REQUEST INTERCEPTOR: This is the source of truth for your token
api.interceptors.request.use(
  (config) => {
    const currentToken = localStorage.getItem("token");
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR: Handles global 401s (Token Expired/Invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Don't redirect if we are already trying to log in
      if (!['/login', '/register'].includes(currentPath)) {
        clearAuthSession();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;