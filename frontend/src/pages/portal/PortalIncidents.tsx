import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getPortalIncidents, 
  getPortalStats, 
  acknowledgePortalIncident, 
  resolvePortalIncident,
  type PortalIncident,
  type PortalDashboardStats 
} from '../api/portalClient';
import { useToast } from '../components/Toast';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity, 
  Bell, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';

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

export default function PortalIncidents() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [incidents, setIncidents] = useState<PortalIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PortalDashboardStats | null>(null);
  const [timeRange, setTimeRange] = useState('last_7_days');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [incidentsData, statsData] = await Promise.all([
        getPortalIncidents({ time_range: timeRange, limit: 100 }),
        getPortalStats({ time_range: timeRange }),
      ]);
      setIncidents(incidentsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load data', err);
      showToast('error', 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (incident: PortalIncident, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await acknowledgePortalIncident(incident.id);
      showToast('success', 'Incident acknowledged');
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast('error', error.response?.data?.detail || 'Failed to acknowledge');
    }
  };

  const handleResolve = async (incident: PortalIncident, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await resolvePortalIncident(incident.id);
      showToast('success', 'Incident resolved');
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast('error', error.response?.data?.detail || 'Failed to resolve');
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: { 
    title: string; 
    value: number | string; 
    icon: React.ElementType; 
    color: string 
  }) => (
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Incidents</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor and manage your organization's incidents</p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="select-field w-40"
          >
            {timeRangeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All Incidents</h2>
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
                    <tr 
                      key={incident.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/portal/incidents/${incident.id}`)}
                    >
                      <td className="table-cell">
                        <span className={status.className}>{status.label}</span>
                      </td>
                      <td className="table-cell max-w-xs truncate font-medium text-slate-900">
                        {incident.payload?.details || '-'}
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          L{incident.current_escalation_level}
                        </span>
                      </td>
                      <td className="table-cell">{incident.current_retry_count}</td>
                      <td className="table-cell text-slate-500">
                        {new Date(incident.created_at).toLocaleString()}
                      </td>
                      <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {incident.status === 'OPEN' && (
                            <button
                              onClick={(e) => handleAcknowledge(incident, e)}
                              className="btn-ghost text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="Acknowledge"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                          {(incident.status === 'OPEN' || incident.status === 'ACKNOWLEDGED') && (
                            <button
                              onClick={(e) => handleResolve(incident, e)}
                              className="btn-ghost text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Resolve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/portal/incidents/${incident.id}`)}
                            className="btn-outline text-xs"
                            title="View Details"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
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
    </div>
  );
}
