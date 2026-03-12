import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = async (username: string, password: string) => {
  const response = await api.post('/api/v1/admin/auth/login', { username, password });
  return response.data;
};

export const getClients = async () => {
  const response = await api.get('/api/v1/admin/clients');
  return response.data;
};

export const createClient = async (data: { company_name: string; is_active: boolean }) => {
  const response = await api.post('/api/v1/admin/clients', data);
  return response.data;
};

export const updateClient = async (id: string, data: { company_name?: string; is_active?: boolean }) => {
  const response = await api.put(`/api/v1/admin/clients/${id}`, data);
  return response.data;
};

export const regenerateClientKey = async (id: string) => {
  const response = await api.post(`/api/v1/admin/clients/${id}/regenerate-key`);
  return response.data;
};

export const getContacts = async (clientId?: string) => {
  const params = clientId ? { client_id: clientId } : {};
  const response = await api.get('/api/v1/admin/contacts', { params });
  return response.data;
};

export const createContact = async (data: {
  client_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  is_active: boolean;
}) => {
  const response = await api.post('/api/v1/admin/contacts', data);
  return response.data;
};

export const updateContact = async (id: string, data: {
  full_name?: string;
  email?: string;
  phone_number?: string;
  is_active?: boolean;
}) => {
  const response = await api.put(`/api/v1/admin/contacts/${id}`, data);
  return response.data;
};

export const getPolicies = async (clientId?: string) => {
  const params = clientId ? { client_id: clientId } : {};
  const response = await api.get('/api/v1/admin/policies', { params });
  return response.data;
};

export const createPolicy = async (data: {
  client_id: string;
  name: string;
  max_retries_per_level: number;
  retry_delay_seconds: number;
  tts_message_template: string;
  level_0_contact_id?: string;
  level_1_contact_id?: string;
  level_2_contact_id?: string;
  level_3_contact_id?: string;
  level_4_contact_id?: string;
  level_5_contact_id?: string;
  is_active: boolean;
}) => {
  const response = await api.post('/api/v1/admin/policies', data);
  return response.data;
};

export const updatePolicy = async (id: string, data: Partial<{
  name: string;
  max_retries_per_level: number;
  retry_delay_seconds: number;
  tts_message_template: string;
  level_0_contact_id: string;
  level_1_contact_id: string;
  level_2_contact_id: string;
  level_3_contact_id: string;
  level_4_contact_id: string;
  level_5_contact_id: string;
  is_active: boolean;
}>) => {
  const response = await api.put(`/api/v1/admin/policies/${id}`, data);
  return response.data;
};

export const getIncidents = async (params?: { client_id?: string; status?: string; limit?: number; offset?: number }) => {
  const response = await api.get('/api/v1/admin/incidents', { params });
  return response.data;
};

export const getIncidentLogs = async (incidentId: string) => {
  const response = await api.get(`/api/v1/admin/incidents/${incidentId}/logs`);
  return response.data;
};

export default api;
