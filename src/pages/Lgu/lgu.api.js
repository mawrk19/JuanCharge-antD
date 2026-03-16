import api from '../../services/api'; 
const API_URL = import.meta.env.VITE_API_URL;

export const getLgus = () => api.get(`${API_URL}/lgus`);
export const createLgu = (data) => api.post(`${API_URL}/lgus`, data);
export const updateLgu = (id, data) => api.put(`${API_URL}/lgus/${id}`, data);
export const deleteLgu = (id) => api.delete(`${API_URL}/lgus/${id}`);