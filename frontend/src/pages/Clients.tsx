import { useEffect, useState } from 'react';
import { getClients, createClient, updateClient, deleteClient, regenerateClientKey } from '../api/client';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { Plus, RefreshCw, Building2, CheckCircle, X, Pencil, Trash2 } from 'lucide-react';

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ company_name: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const { showToast } = useToast();

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

  const openCreateModal = () => {
    setFormData({ company_name: '', is_active: true });
    setEditingClient(null);
    setIsEditMode(false);
    setShowForm(true);
  };

  const openEditModal = (client: Client) => {
    setFormData({ company_name: client.company_name, is_active: client.is_active });
    setEditingClient(client);
    setIsEditMode(true);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setIsEditMode(false);
    setEditingClient(null);
    setFormData({ company_name: '', is_active: true });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await createClient(formData);
      setClients([...clients, { 
        ...created, 
        api_key: created.api_key,
        api_key_preview: created.api_key_preview 
      }]);
      setNewApiKey(created.api_key);
      closeModal();
      showToast('success', 'Client created successfully');
    } catch (err) {
      console.error('Failed to create client', err);
      showToast('error', 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setSubmitting(true);
    try {
      const updated = await updateClient(editingClient.id, formData);
      setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...updated } : c));
      closeModal();
      showToast('success', 'Client updated successfully');
    } catch (err) {
      console.error('Failed to update client', err);
      showToast('error', 'Failed to update client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
      showToast('success', 'Client deleted successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const message = error.response?.data?.detail || 'Failed to delete client';
      console.error('Failed to delete client', err);
      showToast('error', message);
    }
  };

  const handleRegenerateKey = async (id: string) => {
    try {
      const updated = await regenerateClientKey(id);
      setClients(clients.map(c => c.id === id ? { 
        ...c, 
        api_key: updated.api_key,
        api_key_preview: updated.api_key_preview 
      } : c));
      setNewApiKey(updated.api_key);
      showToast('success', 'API key regenerated');
    } catch (err) {
      console.error('Failed to regenerate key', err);
      showToast('error', 'Failed to regenerate API key');
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
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
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
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">
                          {client.api_key_preview || '-'}
                        </code>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(client)}
                            className="btn-ghost text-xs"
                            title="Edit Client"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRegenerateKey(client.id)}
                            className="btn-ghost text-xs"
                            title="Regenerate API Key"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="btn-ghost text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Client"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {isEditMode ? 'Edit Client' : 'Create Client'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={isEditMode ? handleUpdate : handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="input-field"
                    placeholder="Enter company name"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">Active</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1 flex items-center justify-center"
                  >
                    {submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Client' : 'Create Client')}
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
                  className="btn-primary w-full flex items-center justify-center"
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
