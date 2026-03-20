import api from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL;

export const getAuditTrails = (params = {}) =>
  api.get(`${API_URL}/lgu/audit-trails`, { params });
