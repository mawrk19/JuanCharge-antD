import api from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL;

export const getFieldReports = (params = {}) => api.get(`${API_URL}/lgu/field-reports`, { params });

export const createFieldReport = (payload) => {
  const formData = new FormData();

  formData.append('kiosk_id', String(payload.kiosk_id));
  formData.append('activity_type', payload.activity_type || 'collection_completed');
  formData.append('condition_assessment', payload.condition_assessment || 'good');
  formData.append('notes', payload.notes || '');

  if (payload.schedule_name) {
    formData.append('schedule_name', payload.schedule_name);
  }

  if (Array.isArray(payload.schedule_days)) {
    payload.schedule_days.forEach((day, index) => {
      formData.append(`schedule_days[${index}]`, day);
    });
  }

  if (payload.schedule_alignment) {
    formData.append('schedule_alignment', payload.schedule_alignment);
  }

  if (Array.isArray(payload.photo_proof)) {
    payload.photo_proof.forEach((file, index) => {
      if (file instanceof File) {
        formData.append(`photos[${index}]`, file);
      }
    });
  }

  return api.post(`${API_URL}/lgu/field-reports`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const verifyFieldReport = (id) => api.post(`${API_URL}/lgu/field-reports/${id}/verify`);

export const forceMaintenanceFromReport = (id) =>
  api.post(`${API_URL}/lgu/field-reports/${id}/force-maintenance`);

export const createTicketFromReport = (id, payload) =>
  api.post(`${API_URL}/lgu/field-reports/${id}/ticket`, payload);

export const closeTicket = (id, payload) => api.post(`${API_URL}/lgu/tickets/${id}/close`, payload);

export const getKpi = (month) => api.get(`${API_URL}/lgu/reports/kpi`, { params: { month } });

export const getMissedCollectionAlerts = () => api.get(`${API_URL}/lgu/kiosks/alerts/missed-collections`);
