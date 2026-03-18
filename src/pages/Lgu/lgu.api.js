import api from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || '';
const endpoint = (path) => `${API_URL}${path}`;

export const getLgus = () => api.get(endpoint('/lgus'));
export const createLgu = (data) => api.post(endpoint('/lgus'), data);
export const updateLgu = (id, data) => api.put(endpoint(`/lgus/${id}`), data);
export const deleteLgu = (id) => api.delete(endpoint(`/lgus/${id}`));

export const getLguSystemConfig = (params = {}) =>
	api.get(endpoint('/system-config'), { params });

export const upsertLguSystemConfig = (payload, params = {}) =>
	api.put(endpoint('/system-config'), payload, { params });

export const getCollectionSchedules = (params = {}) =>
	api.get(endpoint('/collection-schedules'), { params });

export const createCollectionSchedule = (payload) =>
	api.post(endpoint('/collection-schedules'), payload);

export const updateCollectionSchedule = (id, payload) =>
	api.put(endpoint(`/collection-schedules/${id}`), payload);

export const deleteCollectionSchedule = (id) =>
	api.delete(endpoint(`/collection-schedules/${id}`));

export const notifyCollectionSchedule = (id) =>
	api.post(endpoint(`/collection-schedules/${id}/notify`));

export const getCollectionNotifications = (params = {}) =>
	api.get(endpoint('/collection-notifications'), { params });

export const markCollectionNotificationRead = (id) =>
	api.post(endpoint(`/collection-notifications/${id}/read`));