import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClients, createClient, regenerateClientKey } from '../api/client';
import { Plus, RefreshCw } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">NOC Platform</h1>
          <div className="flex gap-4">
            <Link to="/dashboard" className="text-slate-600 hover:underline">Incidents</Link>
            <Link to="/clients" className="text-blue-600 hover:underline">Clients</Link>
            <Link to="/contacts" className="text-slate-600 hover:underline">Contacts</Link>
            <Link to="/policies" className="text-slate-600 hover:underline">Policies</Link>
          </div>
        </div>
      </nav>

      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Clients</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">API Key</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{client.company_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${client.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{client.api_key ? client.api_key.slice(0, 20) + '...' : '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRegenerateKey(client.id)}
                        className="text-blue-600 hover:text-blue-800"
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
              <div className="text-center py-8 text-slate-500">No clients found</div>
            )}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h3 className="font-bold text-lg mb-4">Create Client</h3>
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={newClient.company_name}
                    onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newClient.is_active}
                      onChange={(e) => setNewClient({ ...newClient, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">Active</span>
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {newApiKey && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h3 className="font-bold text-lg mb-4 text-green-600">Client Created!</h3>
              <p className="text-sm text-slate-600 mb-2">Save this API key - it will not be shown again:</p>
              <div className="bg-slate-50 p-3 rounded font-mono text-sm break-all">{newApiKey}</div>
              <button
                onClick={() => setNewApiKey(null)}
                className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                I have saved the key
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
