import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getPortalIncident, 
  getPortalIncidentLogs,
  acknowledgePortalIncident,
  resolvePortalIncident,
  type PortalIncident,
  type PortalIncidentLog
} from '../api/portalClient';
import { useToast } from '../components/Toast';
import { 
  AlertTriangle, 
  CheckCircle, 
  Bell,
  ArrowLeft,
  Activity,
  RotateCcw,
  Mail,
  Phone,
  Check
} from 'lucide-react';

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  OPEN: { label: 'Open', className: 'badge-danger', icon: AlertTriangle },
  ACKNOWLEDGED: { label: 'Acknowledged', className: 'badge-warning', icon: Bell },
  RESOLVED: { label: 'Resolved', className: 'badge-success', icon: Check },
  FAILED_ESCALATION: { label: 'Failed', className: 'badge-neutral', icon: AlertTriangle },
};

const actionIcons: Record<string, React.ElementType> = {
  INGESTED: Activity,
  EMAIL_SENT: Mail,
  CALL_INITIATED: Phone,
  ACKNOWLEDGED: Bell,
  ESCALATED: RotateCcw,
  MAX_RETRIES_REACHED: AlertTriangle,
  RESOLVED: Check,
};

const actionLabels: Record<string, string> = {
  INGESTED: 'Incident Created',
  EMAIL_SENT: 'Email Sent',
  CALL_INITIATED: 'Call Initiated',
  ACKNOWLEDGED: 'Acknowledged',
  ESCALATED: 'Escalated',
  MAX_RETRIES_REACHED: 'Max Retries Reached',
  RESOLVED: 'Resolved',
};

export default function PortalIncidentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [incident, setIncident] = useState<PortalIncident | null>(null);
  const [logs, setLogs] = useState<PortalIncidentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [incidentData, logsData] = await Promise.all([
        getPortalIncident(id),
        getPortalIncidentLogs(id),
      ]);
      setIncident(incidentData);
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to load incident', err);
      showToast('error', 'Failed to load incident details');
      navigate('/portal/incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!incident) return;
    setActionLoading(true);
    try {
      const updated = await acknowledgePortalIncident(incident.id);
      setIncident(updated);
      showToast('success', 'Incident acknowledged');
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast('error', error.response?.data?.detail || 'Failed to acknowledge');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!incident) return;
    setActionLoading(true);
    try {
      const updated = await resolvePortalIncident(incident.id);
      setIncident(updated);
      showToast('success', 'Incident resolved');
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast('error', error.response?.data?.detail || 'Failed to resolve');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-slate-500">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Loading incident details...</span>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <AlertTriangle className="w-8 h-8 mb-2 text-slate-300" />
        <p>Incident not found</p>
      </div>
    );
  }

  const status = statusConfig[incident.status] || { label: incident.status, className: 'badge-neutral', icon: AlertTriangle };
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/portal/incidents')}
          className="btn-ghost p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incident Details</h1>
          <p className="text-sm text-slate-500 font-mono mt-1">{incident.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  incident.status === 'OPEN' ? 'bg-red-100 text-red-600' :
                  incident.status === 'ACKNOWLEDGED' ? 'bg-amber-100 text-amber-600' :
                  incident.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className={status.className}>{status.label}</span>
                  <p className="text-sm text-slate-500 mt-1">
                    Created {new Date(incident.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {incident.status === 'OPEN' && (
                  <button
                    onClick={handleAcknowledge}
                    disabled={actionLoading}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Acknowledge
                  </button>
                )}
                {(incident.status === 'OPEN' || incident.status === 'ACKNOWLEDGED') && (
                  <button
                    onClick={handleResolve}
                    disabled={actionLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Resolve
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">Details</h3>
                <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">
                  {incident.payload?.details || 'No details provided'}
                </p>
              </div>

              {incident.payload && Object.keys(incident.payload).length > 1 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Additional Info</h3>
                  <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(incident.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Incident Timeline</h2>
            </div>
            <div className="p-5">
              {logs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No activity logs available</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
                  <div className="space-y-6">
                    {logs.map((log, index) => {
                      const ActionIcon = actionIcons[log.action_type] || Activity;
                      const label = actionLabels[log.action_type] || log.action_type;
                      const isFirst = index === 0;
                      
                      return (
                        <div key={log.id} className="relative flex gap-4">
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${
                            isFirst ? 'bg-primary-100 text-primary-600' :
                            log.action_type === 'RESOLVED' ? 'bg-emerald-100 text-emerald-600' :
                            log.action_type === 'ACKNOWLEDGED' ? 'bg-amber-100 text-amber-600' :
                            log.action_type === 'ESCALATED' ? 'bg-orange-100 text-orange-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            <ActionIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900">{label}</span>
                              {isFirst && (
                                <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                                  Latest
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 mb-2">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <pre className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Incident Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">Escalation Level</p>
                <p className="text-lg font-semibold text-slate-900">
                  Level {incident.current_escalation_level}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Retry Count</p>
                <p className="text-lg font-semibold text-slate-900">
                  {incident.current_retry_count}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Policy ID</p>
                <p className="text-sm font-mono text-slate-600">
                  {incident.policy_id || 'None'}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {incident.status === 'OPEN' && (
                <button
                  onClick={handleAcknowledge}
                  disabled={actionLoading}
                  className="btn-secondary w-full justify-center"
                >
                  <Bell className="w-4 h-4" />
                  Acknowledge Incident
                </button>
              )}
              {(incident.status === 'OPEN' || incident.status === 'ACKNOWLEDGED') && (
                <button
                  onClick={handleResolve}
                  disabled={actionLoading}
                  className="btn-primary w-full justify-center"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve Incident
                </button>
              )}
              <button
                onClick={() => navigate('/portal/incidents')}
                className="btn-ghost w-full justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
