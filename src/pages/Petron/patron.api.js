import api from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || '';
const endpoint = `${API_URL}/kiosk-users`;

export const getKioskUsers = ({ page = 1, perPage = 10 } = {}) =>
	api.get(endpoint, {
		params: {
			page,
			per_page: perPage,
		},
	});

export const createKioskUser = (data) => api.post(endpoint, data);
export const updateKioskUser = (id, data) => api.put(`${endpoint}/${id}`, data);
export const deleteKioskUser = (id) => api.delete(`${endpoint}/${id}`);