import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return '/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

export const portalApi = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalApi.interceptors.response.use(
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

export interface PortalIncident {
  id: string;
  client_id: string;
  policy_id: string | null;
  payload: { details?: string; [key: string]: unknown };
  status: string;
  current_escalation_level: number;
  current_retry_count: number;
  acknowledged_by: string | null;
  created_at: string;
}

export interface PortalIncidentLog {
  id: string;
  incident_id: string;
  action_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PortalDashboardStats {
  open_count: number;
  acknowledged_count: number;
  total_count: number;
  time_range: string;
}

export interface PortalChartsData {
  mtta_seconds: number | null;
  escalation_funnel: { level: string; count: number }[];
  incidents_trend: { date: string; count: number }[];
}

export interface PortalContact {
  id: string;
  client_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  is_active: boolean;
  is_deleted: boolean;
  language: string;
}

export const getPortalIncidents = async (params?: { 
  status?: string; 
  limit?: number; 
  offset?: number; 
  time_range?: string 
}): Promise<PortalIncident[]> => {
  const response = await portalApi.get('/v1/portal/incidents/', { params });
  return response.data;
};

export const getPortalIncident = async (id: string): Promise<PortalIncident> => {
  const response = await portalApi.get(`/v1/portal/incidents/${id}/`);
  return response.data;
};

export const getPortalIncidentLogs = async (id: string): Promise<PortalIncidentLog[]> => {
  const response = await portalApi.get(`/v1/portal/incidents/${id}/logs/`);
  return response.data;
};

export const acknowledgePortalIncident = async (id: string): Promise<PortalIncident> => {
  const response = await portalApi.post(`/v1/portal/incidents/${id}/acknowledge/`);
  return response.data;
};

export const resolvePortalIncident = async (id: string): Promise<PortalIncident> => {
  const response = await portalApi.post(`/v1/portal/incidents/${id}/resolve/`);
  return response.data;
};

export const getPortalStats = async (params?: { time_range?: string }): Promise<PortalDashboardStats> => {
  const response = await portalApi.get('/v1/portal/stats/', { params });
  return response.data;
};

export const getPortalCharts = async (params?: { time_range?: string }): Promise<PortalChartsData> => {
  const response = await portalApi.get('/v1/portal/charts/', { params });
  return response.data;
};

export const getPortalContacts = async (): Promise<PortalContact[]> => {
  const response = await portalApi.get('/v1/portal/contacts/');
  return response.data;
};

export const getPortalContact = async (id: string): Promise<PortalContact> => {
  const response = await portalApi.get(`/v1/portal/contacts/${id}/`);
  return response.data;
};

export default portalApi;
