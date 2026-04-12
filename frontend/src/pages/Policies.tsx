import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getClients, getContacts, getPolicies, createPolicy, updatePolicy, deletePolicy } from '../api/client';
import { useToast } from '../components/Toast';
import { Plus, FileText, Clock, ArrowRight, X, Pencil, Trash2, RefreshCw } from 'lucide-react';

interface Client {
  id: string;
  company_name: string;
}

interface Contact {
  id: string;
  client_id: string;
  full_name: string;
  is_active: boolean;
}

interface Policy {
  id: string;
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
}

const escalationLevels = [
  { level: 0, label: 'Level 0', description: 'Initial notification', color: 'bg-blue-500' },
  { level: 1, label: 'Level 1', description: 'First escalation', color: 'bg-indigo-500' },
  { level: 2, label: 'Level 2', description: 'Second escalation', color: 'bg-purple-500' },
  { level: 3, label: 'Level 3', description: 'Third escalation', color: 'bg-pink-500' },
  { level: 4, label: 'Level 4', description: 'Fourth escalation', color: 'bg-rose-500' },
  { level: 5, label: 'Level 5', description: 'Final escalation', color: 'bg-red-600' },
];

const defaultPolicy = {
  client_id: '',
  name: '',
  max_retries_per_level: 3,
  retry_delay_seconds: 60,
  tts_message_template: 'Alert: {incident_details}. Press 1 to take ownership.',
  level_0_contact_id: '',
  level_1_contact_id: '',
  level_2_contact_id: '',
  level_3_contact_id: '',
  level_4_contact_id: '',
  level_5_contact_id: '',
  is_active: true,
};

const LOCALSTORAGE_KEY = 'noc_selected_client_id';

export default function Policies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    return searchParams.get('client_id') || localStorage.getItem(LOCALSTORAGE_KEY) || '';
  });
  const [formData, setFormData] = useState(defaultPolicy);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadFilteredPolicies();
  }, [selectedClientId]);

  useEffect(() => {
    if (selectedClientId) {
      setSearchParams({ client_id: selectedClientId });
    } else {
      setSearchParams({});
    }
    localStorage.setItem(LOCALSTORAGE_KEY, selectedClientId);
  }, [selectedClientId, setSearchParams]);

  const loadClients = async () => {
    try {
      const [clientsData, contactsData] = await Promise.all([
        getClients(),
        getContacts(),
      ]);
      setClients(clientsData);
      setContacts(contactsData);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredPolicies = async () => {
    setLoading(true);
    try {
      const policiesData = await getPolicies(selectedClientId || undefined);
      setPolicies(policiesData);
    } catch (err) {
      console.error('Failed to load policies', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClientFilterChange = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const openCreateModal = () => {
    setFormData({ ...defaultPolicy, client_id: selectedClientId || clients[0]?.id || '' });
    setEditingPolicy(null);
    setIsEditMode(false);
    setShowForm(true);
  };

  const openEditModal = (policy: Policy) => {
    setFormData({
      client_id: policy.client_id,
      name: policy.name,
      max_retries_per_level: policy.max_retries_per_level,
      retry_delay_seconds: policy.retry_delay_seconds,
      tts_message_template: policy.tts_message_template,
      level_0_contact_id: policy.level_0_contact_id || '',
      level_1_contact_id: policy.level_1_contact_id || '',
      level_2_contact_id: policy.level_2_contact_id || '',
      level_3_contact_id: policy.level_3_contact_id || '',
      level_4_contact_id: policy.level_4_contact_id || '',
      level_5_contact_id: policy.level_5_contact_id || '',
      is_active: policy.is_active,
    });
    setEditingPolicy(policy);
    setIsEditMode(true);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setIsEditMode(false);
    setEditingPolicy(null);
    setFormData({ ...defaultPolicy, client_id: selectedClientId || clients[0]?.id || '' });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const policyData = {
        ...formData,
        level_0_contact_id: formData.level_0_contact_id || undefined,
        level_1_contact_id: formData.level_1_contact_id || undefined,
        level_2_contact_id: formData.level_2_contact_id || undefined,
        level_3_contact_id: formData.level_3_contact_id || undefined,
        level_4_contact_id: formData.level_4_contact_id || undefined,
        level_5_contact_id: formData.level_5_contact_id || undefined,
      };
      const created = await createPolicy(policyData);
      setPolicies([...policies, created]);
      closeModal();
      showToast('success', 'Policy created successfully');
    } catch (err) {
      console.error('Failed to create policy', err);
      showToast('error', 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    setSubmitting(true);
    try {
      const policyData = {
        name: formData.name,
        max_retries_per_level: formData.max_retries_per_level,
        retry_delay_seconds: formData.retry_delay_seconds,
        tts_message_template: formData.tts_message_template,
        level_0_contact_id: formData.level_0_contact_id || undefined,
        level_1_contact_id: formData.level_1_contact_id || undefined,
        level_2_contact_id: formData.level_2_contact_id || undefined,
        level_3_contact_id: formData.level_3_contact_id || undefined,
        level_4_contact_id: formData.level_4_contact_id || undefined,
        level_5_contact_id: formData.level_5_contact_id || undefined,
        is_active: formData.is_active,
      };
      const updated = await updatePolicy(editingPolicy.id, policyData);
      setPolicies(policies.map(p => p.id === editingPolicy.id ? { ...p, ...updated } : p));
      closeModal();
      showToast('success', 'Policy updated successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      const message = error.response?.data?.detail || error.message || 'Failed to update policy';
      console.error('Failed to update policy', err);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
      return;
    }
    try {
      await deletePolicy(id);
      setPolicies(policies.filter(p => p.id !== id));
      showToast('success', 'Policy deleted successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const message = error.response?.data?.detail || 'Failed to delete policy';
      console.error('Failed to delete policy', err);
      showToast('error', message);
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || clientId.slice(0, 8);
  };

  const getSelectedClientName = () => {
    if (!selectedClientId) return null;
    const client = clients.find(c => c.id === selectedClientId);
    return client?.company_name || null;
  };

  const selectedClientName = getSelectedClientName();
  const clientContacts = contacts.filter(c => c.client_id === formData.client_id && c.is_active);
  const inactiveContacts = contacts.filter(c => c.client_id === formData.client_id && !c.is_active);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Escalation Policies</h1>
            <p className="text-sm text-slate-500 mt-1">Configure incident escalation workflows</p>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Policy
          </button>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <label className="text-sm font-medium text-slate-600">Filter by Client:</label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientFilterChange(e.target.value)}
              className="select-field w-48"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.company_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <FileText className="w-5 h-5 animate-spin mr-2" />
              Loading policies...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header">Name</th>
                    <th className="table-header">Client</th>
                    <th className="table-header">Retries</th>
                    <th className="table-header">Delay</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {policies.map((policy) => (
                    <tr key={policy.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary-600" />
                          </div>
                          <span className="font-medium text-slate-900">{policy.name}</span>
                        </div>
                      </td>
                      <td className="table-cell">{getClientName(policy.client_id)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <RefreshCw className="w-4 h-4" />
                          {policy.max_retries_per_level}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-4 h-4" />
                          {policy.retry_delay_seconds}s
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={policy.is_active ? 'badge-success' : 'badge-neutral'}>
                          {policy.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(policy)}
                            className="btn-ghost text-xs"
                            title="Edit Policy"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(policy.id)}
                            className="btn-ghost text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Policy"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {policies.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <FileText className="w-8 h-8 mb-2 text-slate-300" />
                  <p>
                    {selectedClientName 
                      ? `No policies found for ${selectedClientName}`
                      : 'No policies found'}
                  </p>
                  <p className="text-sm mt-1">Try a different client or create a new policy</p>
                </div>
              )}
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {isEditMode ? 'Edit Escalation Policy' : 'Create Escalation Policy'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {isEditMode ? 'Update the escalation workflow' : 'Define how incidents should be escalated'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={isEditMode ? handleUpdate : handleCreate} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      className="select-field"
                      required
                      disabled={!isEditMode && selectedClientId !== ''}
                    >
                      <option value="">Select client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.company_name}</option>
                      ))}
                    </select>
                    {!isEditMode && selectedClientId !== '' && (
                      <p className="text-xs text-slate-500 mt-1">Client is locked to the selected filter</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Policy Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Critical Alert Policy"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Retries per Level</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.max_retries_per_level}
                      onChange={(e) => setFormData({ ...formData, max_retries_per_level: parseInt(e.target.value) })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Retry Delay (seconds)</label>
                    <input
                      type="number"
                      min="10"
                      value={formData.retry_delay_seconds}
                      onChange={(e) => setFormData({ ...formData, retry_delay_seconds: parseInt(e.target.value) })}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">TTS Message Template</label>
                  <textarea
                    value={formData.tts_message_template}
                    onChange={(e) => setFormData({ ...formData, tts_message_template: e.target.value })}
                    className="input-field"
                    rows={2}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Use {'{incident_details}'} as placeholder</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Escalation Flow</label>
                  <div className="space-y-3">
                    {escalationLevels.map((level, index) => (
                      <div key={level.level} className="relative">
                        <div className={`p-4 rounded-lg border-2 transition-all ${level.level === 0 ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl ${level.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <span className="text-sm font-bold text-white">{level.level}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-slate-900">{level.label}</span>
                                <span className="text-xs text-slate-500">· {level.description}</span>
                              </div>
                              <select
                                value={formData[`level_${level.level}_contact_id` as keyof typeof formData] as string}
                                onChange={(e) => setFormData({ ...formData, [`level_${level.level}_contact_id`]: e.target.value })}
                                className="select-field text-sm"
                              >
                                <option value="">Select contact (optional)</option>
                                {clientContacts.map(contact => (
                                  <option key={contact.id} value={contact.id}>{contact.full_name}</option>
                                ))}
                                {inactiveContacts.map(contact => (
                                  <option key={contact.id} value={contact.id} disabled>
                                    {contact.full_name} (Inactive)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        {index < escalationLevels.length - 1 && (
                          <div className="absolute left-5 -bottom-3 z-10">
                            <ArrowRight className="w-4 h-4 text-slate-300 rotate-90" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors flex-1">
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
                    {submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Policy' : 'Create Policy')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
