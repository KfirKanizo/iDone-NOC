import { useEffect, useState } from 'react';
import { getClients, getContacts, getPolicies, createPolicy } from '../api/client';
import Layout from '../components/Layout';
import { Plus, FileText, Clock, ArrowRight, X } from 'lucide-react';

interface Client {
  id: string;
  company_name: string;
}

interface Contact {
  id: string;
  client_id: string;
  full_name: string;
}

interface Policy {
  id: string;
  client_id: string;
  name: string;
  max_retries_per_level: number;
  retry_delay_seconds: number;
  tts_message_template: string;
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

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [newPolicy, setNewPolicy] = useState({
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
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setNewPolicy(prev => ({ ...prev, client_id: selectedClient }));
  }, [selectedClient]);

  const loadData = async () => {
    try {
      const [clientsData, contactsData, policiesData] = await Promise.all([
        getClients(),
        getContacts(),
        getPolicies(),
      ]);
      setClients(clientsData);
      setContacts(contactsData);
      setPolicies(policiesData);
      if (clientsData.length > 0) {
        setSelectedClient(clientsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const policyData = {
        ...newPolicy,
        level_0_contact_id: newPolicy.level_0_contact_id || undefined,
        level_1_contact_id: newPolicy.level_1_contact_id || undefined,
        level_2_contact_id: newPolicy.level_2_contact_id || undefined,
        level_3_contact_id: newPolicy.level_3_contact_id || undefined,
        level_4_contact_id: newPolicy.level_4_contact_id || undefined,
        level_5_contact_id: newPolicy.level_5_contact_id || undefined,
      };
      const created = await createPolicy(policyData);
      setPolicies([...policies, created]);
      setShowForm(false);
      setNewPolicy({
        client_id: selectedClient,
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
      });
    } catch (err) {
      console.error('Failed to create policy', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || clientId.slice(0, 8);
  };

  const clientContacts = contacts.filter(c => c.client_id === selectedClient);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Escalation Policies</h1>
            <p className="text-sm text-slate-500 mt-1">Configure incident escalation workflows</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create Policy
          </button>
        </div>

        {/* Policies Table */}
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
                    </tr>
                  ))}
                </tbody>
              </table>
              {policies.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <FileText className="w-8 h-8 mb-2 text-slate-300" />
                  <p>No policies found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Create Escalation Policy</h3>
                  <p className="text-sm text-slate-500">Define how incidents should be escalated</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreate} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="select-field"
                      required
                    >
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Policy Name</label>
                    <input
                      type="text"
                      value={newPolicy.name}
                      onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
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
                      value={newPolicy.max_retries_per_level}
                      onChange={(e) => setNewPolicy({ ...newPolicy, max_retries_per_level: parseInt(e.target.value) })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Retry Delay (seconds)</label>
                    <input
                      type="number"
                      min="10"
                      value={newPolicy.retry_delay_seconds}
                      onChange={(e) => setNewPolicy({ ...newPolicy, retry_delay_seconds: parseInt(e.target.value) })}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">TTS Message Template</label>
                  <textarea
                    value={newPolicy.tts_message_template}
                    onChange={(e) => setNewPolicy({ ...newPolicy, tts_message_template: e.target.value })}
                    className="input-field"
                    rows={2}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Use {'{incident_details}'} as placeholder</p>
                </div>

                {/* Escalation Flow */}
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
                                value={newPolicy[`level_${level.level}_contact_id` as keyof typeof newPolicy] as string}
                                onChange={(e) => setNewPolicy({ ...newPolicy, [`level_${level.level}_contact_id`]: e.target.value })}
                                className="select-field text-sm"
                              >
                                <option value="">Select contact (optional)</option>
                                {clientContacts.map(contact => (
                                  <option key={contact.id} value={contact.id}>{contact.full_name}</option>
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
                      checked={newPolicy.is_active}
                      onChange={(e) => setNewPolicy({ ...newPolicy, is_active: e.target.checked })}
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
                    {submitting ? 'Creating...' : 'Create Policy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function RefreshCw({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}
