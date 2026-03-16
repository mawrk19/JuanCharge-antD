import api from '../../services/api'; 
const API_URL = import.meta.env.VITE_API_URL;

export const getLguUsers = () => api.get(`${API_URL}/lgu-users`);
export const createLguUser = (data) => api.post(`${API_URL}/lgu-users`, data);
export const updateLguUser = (id, data) => api.put(`${API_URL}/lgu-users/${id}`, data);
export const deleteLguUser = (id) => api.delete(`${API_URL}/lgu-users/${id}`);