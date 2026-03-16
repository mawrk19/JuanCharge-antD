import api from '../../services/api'; 
const API_URL = import.meta.env.VITE_API_URL;

export const getKiosks = () => api.get(`${API_URL}/kiosks`);
export const createKiosk = (data) => api.post(`${API_URL}/kiosks`, data);
export const updateKiosk = (id, data) => api.put(`${API_URL}/kiosks/${id}`, data);
export const deleteKiosk = (id) => api.delete(`${API_URL}/kiosks/${id}`);