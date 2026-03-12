import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getIncidents, getIncidentLogs } from '../api/client';
import { Eye } from 'lucide-react';

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

const statusColors: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  FAILED_ESCALATION: 'bg-gray-100 text-gray-800',
};

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [logs, setLogs] = useState<IncidentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const data = await getIncidents({ limit: 50 });
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">NOC Platform</h1>
          <div className="flex gap-4">
            <Link to="/dashboard" className="text-blue-600 hover:underline">Incidents</Link>
            <Link to="/clients" className="text-slate-600 hover:underline">Clients</Link>
            <Link to="/contacts" className="text-slate-600 hover:underline">Contacts</Link>
            <Link to="/policies" className="text-slate-600 hover:underline">Policies</Link>
          </div>
        </div>
      </nav>

      <main className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Incidents</h2>
        
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Retries</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[incident.status] || 'bg-gray-100'}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{incident.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{incident.payload?.details || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{incident.current_escalation_level}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{incident.current_retry_count}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(incident.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => viewLogs(incident)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {incidents.length === 0 && (
              <div className="text-center py-8 text-slate-500">No incidents found</div>
            )}
          </div>
        )}

        {selectedIncident && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">Incident {selectedIncident.id.slice(0, 8)} Logs</h3>
                <button onClick={() => setSelectedIncident(null)} className="text-slate-500 hover:text-slate-700">✕</button>
              </div>
              <div className="p-4">
                {logsLoading ? (
                  <div className="text-center py-4 text-slate-500">Loading logs...</div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="border-l-2 border-blue-500 pl-3 py-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{log.action_type}</span>
                          <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <pre className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    ))}
                    {logs.length === 0 && <div className="text-slate-500">No logs found</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
