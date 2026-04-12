import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return '/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

export const decodeToken = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      client_id: payload.client_id
    };
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: getBaseURL(),
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
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  const response = await api.post('/v1/admin/auth/login', { email, password });
  return response.data;
};

export const getClients = async () => {
  const response = await api.get('/v1/admin/clients');
  return response.data;
};

export const createClient = async (data: { company_name: string; is_active: boolean }) => {
  const response = await api.post('/v1/admin/clients', data);
  return response.data;
};

export const updateClient = async (id: string, data: { company_name?: string; is_active?: boolean }) => {
  const response = await api.put(`/v1/admin/clients/${id}`, data);
  return response.data;
};

export const deleteClient = async (id: string) => {
  const response = await api.delete(`/v1/admin/clients/${id}`);
  return response.data;
};

export const regenerateClientKey = async (id: string) => {
  const response = await api.post(`/v1/admin/clients/${id}/regenerate-key`);
  return response.data;
};

export const getContacts = async (clientId?: string) => {
  const params = clientId ? { client_id: clientId } : {};
  const response = await api.get('/v1/admin/contacts', { params });
  return response.data;
};

export const createContact = async (data: {
  client_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  is_active: boolean;
  language: string;
}) => {
  const response = await api.post('/v1/admin/contacts', data);
  return response.data;
};

export const updateContact = async (id: string, data: {
  full_name?: string;
  email?: string;
  phone_number?: string;
  is_active?: boolean;
  language?: string;
}) => {
  const response = await api.put(`/v1/admin/contacts/${id}`, data);
  return response.data;
};

export const deleteContact = async (id: string) => {
  const response = await api.delete(`/v1/admin/contacts/${id}`);
  return response.data;
};

export const getPolicies = async (clientId?: string) => {
  const params = clientId ? { client_id: clientId } : {};
  const response = await api.get('/v1/admin/policies', { params });
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
  const response = await api.post('/v1/admin/policies', data);
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
  const response = await api.put(`/v1/admin/policies/${id}`, data);
  return response.data;
};

export const deletePolicy = async (id: string) => {
  const response = await api.delete(`/v1/admin/policies/${id}`);
  return response.data;
};

export const getIncidents = async (params?: { client_id?: string; status?: string; limit?: number; offset?: number; time_range?: string }) => {
  const response = await api.get('/v1/admin/incidents', { params });
  return response.data;
};

export const createIncident = async (data: { client_id: string; details: string; policy_id?: string }) => {
  const response = await api.post('/v1/admin/incidents', data);
  return response.data;
};

export const acknowledgeIncident = async (id: string) => {
  const response = await api.post(`/v1/admin/incidents/${id}/acknowledge`);
  return response.data;
};

export const resolveIncident = async (id: string) => {
  const response = await api.post(`/v1/admin/incidents/${id}/resolve`);
  return response.data;
};

export const getIncidentLogs = async (incidentId: string) => {
  const response = await api.get(`/v1/admin/incidents/${incidentId}/logs`);
  return response.data;
};

export interface DashboardStats {
  open_count: number;
  acknowledged_count: number;
  total_count: number;
  time_range: string;
}

export interface EscalationFunnelItem {
  level: string;
  count: number;
}

export interface IncidentsByClientItem {
  client_name: string;
  count: number;
}

export interface IncidentsTrendItem {
  date: string;
  count: number;
}

export interface ChartsData {
  mtta_seconds: number | null;
  escalation_funnel: EscalationFunnelItem[];
  incidents_by_client: IncidentsByClientItem[];
  incidents_trend: IncidentsTrendItem[];
}

export interface Client {
  id: string;
  company_name: string;
  api_key?: string;
  api_key_preview?: string;
  is_active: boolean;
}

export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  role: UserRole;
  client_id?: string;
}

export interface UserUpdate {
  email?: string;
  password?: string;
  role?: UserRole;
  client_id?: string | null;
  is_active?: boolean;
}

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/v1/admin/users/');
  return response.data;
};

export const createUser = async (data: UserCreate): Promise<User> => {
  const response = await api.post('/v1/admin/users/', data);
  return response.data;
};

export const inviteUser = async (data: Omit<UserCreate, 'password'>): Promise<User> => {
  const response = await api.post('/v1/admin/users/invite', data);
  return response.data;
};

export const updateUser = async (id: string, data: UserUpdate): Promise<User> => {
  const response = await api.patch(`/v1/admin/users/${id}/`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/v1/admin/users/${id}/`);
};

export const getDashboardStats = async (params?: {
  client_id?: string;
  status?: string;
  time_range?: string;
}): Promise<DashboardStats> => {
  const response = await api.get('/v1/analytics/dashboard-stats', { params });
  return response.data;
};

export const getChartsData = async (params?: {
  client_id?: string;
  time_range?: string;
}): Promise<ChartsData> => {
  const response = await api.get('/v1/analytics/charts', { params });
  return response.data;
};

export default api;
