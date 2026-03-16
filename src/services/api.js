import axios from "axios";

// Fallback to your Railway URL if the .env variable isn't found
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://juancharge-backend-production.up.railway.app/api";

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
        localStorage.clear(); // Simpler way to wipe everything
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;