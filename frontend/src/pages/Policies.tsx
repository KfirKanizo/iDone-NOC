import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClients, getContacts, getPolicies, createPolicy } from '../api/client';
import { Plus } from 'lucide-react';

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

  const LevelSelect = ({ level }: { level: number }) => (
    <select
      value={newPolicy[`level_${level}_contact_id` as keyof typeof newPolicy] as string}
      onChange={(e) => setNewPolicy({ ...newPolicy, [`level_${level}_contact_id`]: e.target.value })}
      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Select contact</option>
      {clientContacts.map(contact => (
        <option key={contact.id} value={contact.id}>{contact.full_name}</option>
      ))}
    </select>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">NOC Platform</h1>
          <div className="flex gap-4">
            <Link to="/dashboard" className="text-slate-600 hover:underline">Incidents</Link>
            <Link to="/clients" className="text-slate-600 hover:underline">Clients</Link>
            <Link to="/contacts" className="text-slate-600 hover:underline">Contacts</Link>
            <Link to="/policies" className="text-blue-600 hover:underline">Policies</Link>
          </div>
        </div>
      </nav>

      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Escalation Policies</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Policy
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Retries</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Delay</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{policy.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{getClientName(policy.client_id)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{policy.max_retries_per_level}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{policy.retry_delay_seconds}s</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${policy.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {policies.length === 0 && (
              <div className="text-center py-8 text-slate-500">No policies found</div>
            )}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 my-8">
              <h3 className="font-bold text-lg mb-4">Create Escalation Policy</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Policy Name</label>
                    <input
                      type="text"
                      value={newPolicy.name}
                      onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Retries per Level</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newPolicy.max_retries_per_level}
                      onChange={(e) => setNewPolicy({ ...newPolicy, max_retries_per_level: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Retry Delay (seconds)</label>
                    <input
                      type="number"
                      min="10"
                      value={newPolicy.retry_delay_seconds}
                      onChange={(e) => setNewPolicy({ ...newPolicy, retry_delay_seconds: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">TTS Message Template</label>
                  <textarea
                    value={newPolicy.tts_message_template}
                    onChange={(e) => setNewPolicy({ ...newPolicy, tts_message_template: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Use {'{incident_details}'} as placeholder</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Escalation Contacts</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[0, 1, 2, 3, 4, 5].map(level => (
                      <div key={level}>
                        <label className="block text-xs text-slate-500 mb-1">Level {level}</label>
                        <LevelSelect level={level} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
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
                    {submitting ? 'Creating...' : 'Create Policy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
