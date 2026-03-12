import { useEffect, useState } from 'react';
import { getClients, createClient, regenerateClientKey } from '../api/client';
import Layout from '../components/Layout';
import { Plus, RefreshCw, Building2, CheckCircle, X } from 'lucide-react';

interface Client {
  id: string;
  company_name: string;
  api_key?: string;
  is_active: boolean;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newClient, setNewClient] = useState({ company_name: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await createClient(newClient);
      setClients([...clients, { ...created, api_key: created.api_key }]);
      setNewApiKey(created.api_key);
      setShowForm(false);
      setNewClient({ company_name: '', is_active: true });
    } catch (err) {
      console.error('Failed to create client', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerateKey = async (id: string) => {
    try {
      const updated = await regenerateClientKey(id);
      setClients(clients.map(c => c.id === id ? { ...c, api_key: updated.api_key } : c));
      setNewApiKey(updated.api_key);
    } catch (err) {
      console.error('Failed to regenerate key', err);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
            <p className="text-sm text-slate-500 mt-1">Manage client accounts and API access</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>

        {/* Clients Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading clients...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header">Company</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">API Key</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-slate-500" />
                          </div>
                          <span className="font-medium text-slate-900">{client.company_name}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={client.is_active ? 'badge-success' : 'badge-neutral'}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {client.api_key ? client.api_key.slice(0, 20) + '...' : '-'}
                        </code>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleRegenerateKey(client.id)}
                          className="btn-ghost text-xs"
                          title="Regenerate API Key"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Building2 className="w-8 h-8 mb-2 text-slate-300" />
                  <p>No clients found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Create Client</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
                  <input
                    type="text"
                    value={newClient.company_name}
                    onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                    className="input-field"
                    placeholder="Enter company name"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={newClient.is_active}
                      onChange={(e) => setNewClient({ ...newClient, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">Active</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting ? 'Creating...' : 'Create Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* API Key Modal */}
        {newApiKey && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Client Created!</h3>
                    <p className="text-sm text-slate-500">Save your API key securely</p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800 font-medium">Warning: This key will never be shown again!</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                  <code className="text-sm text-emerald-400 font-mono break-all">{newApiKey}</code>
                </div>
                <button
                  onClick={() => setNewApiKey(null)}
                  className="btn-primary w-full"
                >
                  I have saved the key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
