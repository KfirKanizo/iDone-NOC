import { useEffect, useState } from 'react';
import { getIncidents, getIncidentLogs, getClients, acknowledgeIncident, resolveIncident, createIncident, getDashboardStats, DashboardStats } from '../api/client';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { Eye, AlertTriangle, CheckCircle, Clock, Users, Activity, Bell, Plus, X, RefreshCw } from 'lucide-react';

interface Incident {
  id: string;
  client_id: string;
  policy_id: string | null;
  payload: { details?: string };
  status: string;
  current_escalation_level: number;
  current_retry_count: number;
  created_at: string;
}

interface IncidentLog {
  id: string;
  incident_id: string;
  action_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface Client {
  id: string;
  company_name: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'badge-danger' },
  ACKNOWLEDGED: { label: 'Acknowledged', className: 'badge-warning' },
  RESOLVED: { label: 'Resolved', className: 'badge-success' },
  FAILED_ESCALATION: { label: 'Failed', className: 'badge-neutral' },
};

const timeRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'FAILED_ESCALATION', label: 'Failed' },
];

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [logs, setLogs] = useState<IncidentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ client_id: '', details: '' });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  
  const [filters, setFilters] = useState({
    client_id: '',
    status: '',
    time_range: 'last_7_days',
  });
  
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadFilteredData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [incidentsData, clientsData, statsData] = await Promise.all([
        getIncidents({ limit: 50 }),
        getClients(),
        getDashboardStats({ time_range: filters.time_range }),
      ]);
      setIncidents(incidentsData);
      setClients(clientsData);
      setStats(statsData);
      if (clientsData.length > 0 && !createForm.client_id) {
        setCreateForm(prev => ({ ...prev, client_id: clientsData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredData = async () => {
    setLoading(true);
    try {
      const params: { client_id?: string; status?: string; limit?: number } = { limit: 100 };
      if (filters.client_id) params.client_id = filters.client_id;
      if (filters.status) params.status = filters.status;
      
      const [incidentsData, statsData] = await Promise.all([
        getIncidents(params),
        getDashboardStats({
          client_id: filters.client_id || undefined,
          status: filters.status || undefined,
          time_range: filters.time_range,
        }),
      ]);
      
      setIncidents(incidentsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load filtered data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (incident: Incident) => {
    try {
      await acknowledgeIncident(incident.id);
      showToast('success', 'Incident acknowledged');
      loadFilteredData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast('error', error.response?.data?.detail || 'Failed to acknowledge incident');
    }
  };

  const handleResolve = async (incident: Incident) => {
    try {
      await resolveIncident(incident.id);
      showToast('success', 'Incident resolved');
      loadFilteredData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast('error', error.response?.data?.detail || 'Failed to resolve incident');
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.client_id || !createForm.details) return;
    setSubmitting(true);
    try {
      await createIncident({ client_id: createForm.client_id, details: createForm.details });
      showToast('success', 'Incident created successfully');
      setShowCreateModal(false);
      setCreateForm({ client_id: clients[0]?.id || '', details: '' });
      loadFilteredData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast('error', error.response?.data?.detail || 'Failed to create incident');
    } finally {
      setSubmitting(false);
    }
  };

  const viewLogs = async (incident: Incident) => {
    setSelectedIncident(incident);
    setLogsLoading(true);
    try {
      const data = await getIncidentLogs(incident.id);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || clientId.slice(0, 8);
  };

  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ElementType; color: string }) => (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Incidents Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Monitor and manage all system incidents</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Trigger Incident
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            title="Open Incidents" 
            value={stats?.open_count || 0} 
            icon={AlertTriangle} 
            color="bg-red-100 text-red-600" 
          />
          <StatCard 
            title="Acknowledged" 
            value={stats?.acknowledged_count || 0} 
            icon={Clock} 
            color="bg-amber-100 text-amber-600" 
          />
          <StatCard 
            title="Total (Period)" 
            value={stats?.total_count || 0} 
            icon={Activity} 
            color="bg-blue-100 text-blue-600" 
          />
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={filters.client_id}
              onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}
              className="select-field w-48"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.company_name}</option>
              ))}
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="select-field w-40"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <select
              value={filters.time_range}
              onChange={(e) => setFilters({ ...filters, time_range: e.target.value })}
              className="select-field w-40"
            >
              {timeRangeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <button
              onClick={loadFilteredData}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Incidents</h2>
            <span className="text-sm text-slate-500">{incidents.length} total</span>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-slate-500">
                <Activity className="w-5 h-5 animate-spin" />
                <span>Loading incidents...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header">Status</th>
                    <th className="table-header">Client</th>
                    <th className="table-header">Details</th>
                    <th className="table-header">Level</th>
                    <th className="table-header">Retries</th>
                    <th className="table-header">Created</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidents.map((incident) => {
                    const status = statusConfig[incident.status] || { label: incident.status, className: 'badge-neutral' };
                    return (
                      <tr key={incident.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="table-cell">
                          <span className={status.className}>{status.label}</span>
                        </td>
                        <td className="table-cell font-medium text-slate-900">{getClientName(incident.client_id)}</td>
                        <td className="table-cell max-w-xs truncate">{incident.payload?.details || '-'}</td>
                        <td className="table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            L{incident.current_escalation_level}
                          </span>
                        </td>
                        <td className="table-cell">{incident.current_retry_count}</td>
                        <td className="table-cell text-slate-500">
                          {new Date(incident.created_at).toLocaleString()}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            {incident.status === 'OPEN' && (
                              <button
                                onClick={() => handleAcknowledge(incident)}
                                className="btn-ghost text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                title="Acknowledge"
                              >
                                <Bell className="w-4 h-4" />
                              </button>
                            )}
                            {(incident.status === 'OPEN' || incident.status === 'ACKNOWLEDGED') && (
                              <button
                                onClick={() => handleResolve(incident)}
                                className="btn-ghost text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Resolve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => viewLogs(incident)}
                              className="btn-outline text-xs"
                              title="View Logs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {incidents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <AlertTriangle className="w-8 h-8 mb-2 text-slate-300" />
                  <p>No incidents found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Trigger Incident</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateIncident} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
                  <select
                    value={createForm.client_id}
                    onChange={(e) => setCreateForm({ ...createForm, client_id: e.target.value })}
                    className="select-field"
                    required
                  >
                    <option value="">Select client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Details</label>
                  <textarea
                    value={createForm.details}
                    onChange={(e) => setCreateForm({ ...createForm, details: e.target.value })}
                    className="input-field"
                    placeholder="Enter incident details"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting ? 'Creating...' : 'Create Incident'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedIncident && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Incident Logs</h3>
                  <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedIncident.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Activity className="w-5 h-5 animate-spin text-primary-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id} className="relative pl-4 pb-4 border-l-2 border-primary-200 last:pb-0">
                        <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary-500" />
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-slate-900">{log.action_type}</span>
                          <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <p className="text-center text-slate-500 py-4">No logs found for this incident</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
