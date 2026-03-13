import { useEffect, useState } from 'react';
import { getClients, getContacts, createContact, updateContact, deleteContact } from '../api/client';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { Plus, User, Mail, Phone, X, Pencil, Trash2 } from 'lucide-react';

interface Client {
  id: string;
  company_name: string;
}

interface Contact {
  id: string;
  client_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  is_active: boolean;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    full_name: '',
    email: '',
    phone_number: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contactsData, clientsData] = await Promise.all([
        getContacts(),
        getClients(),
      ]);
      setContacts(contactsData);
      setClients(clientsData);
      if (clientsData.length > 0 && !formData.client_id) {
        setFormData(prev => ({ ...prev, client_id: clientsData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      client_id: clients[0]?.id || '',
      full_name: '',
      email: '',
      phone_number: '',
      is_active: true,
    });
    setEditingContact(null);
    setIsEditMode(false);
    setShowForm(true);
  };

  const openEditModal = (contact: Contact) => {
    setFormData({
      client_id: contact.client_id,
      full_name: contact.full_name,
      email: contact.email,
      phone_number: contact.phone_number,
      is_active: contact.is_active,
    });
    setEditingContact(contact);
    setIsEditMode(true);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setIsEditMode(false);
    setEditingContact(null);
    setFormData({
      client_id: clients[0]?.id || '',
      full_name: '',
      email: '',
      phone_number: '',
      is_active: true,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await createContact(formData);
      setContacts([...contacts, created]);
      closeModal();
      showToast('success', 'Contact created successfully');
    } catch (err) {
      console.error('Failed to create contact', err);
      showToast('error', 'Failed to create contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setSubmitting(true);
    try {
      const updated = await updateContact(editingContact.id, formData);
      setContacts(contacts.map(c => c.id === editingContact.id ? { ...c, ...updated } : c));
      closeModal();
      showToast('success', 'Contact updated successfully');
    } catch (err) {
      console.error('Failed to update contact', err);
      showToast('error', 'Failed to update contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteContact(id);
      setContacts(contacts.filter(c => c.id !== id));
      showToast('success', 'Contact deleted successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const message = error.response?.data?.detail || 'Failed to delete contact';
      console.error('Failed to delete contact', err);
      showToast('error', message);
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || clientId.slice(0, 8);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
            <p className="text-sm text-slate-500 mt-1">Manage escalation contacts for your clients</p>
          </div>
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        {/* Contacts Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <User className="w-5 h-5 animate-spin mr-2" />
              Loading contacts...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header">Name</th>
                    <th className="table-header">Client</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-600" />
                          </div>
                          <span className="font-medium text-slate-900">{contact.full_name}</span>
                        </div>
                      </td>
                      <td className="table-cell">{getClientName(contact.client_id)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {contact.email}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <code className="text-xs">{contact.phone_number}</code>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={contact.is_active ? 'badge-success' : 'badge-neutral'}>
                          {contact.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(contact)}
                            className="btn-ghost text-xs"
                            title="Edit Contact"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="btn-ghost text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {contacts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <User className="w-8 h-8 mb-2 text-slate-300" />
                  <p>No contacts found</p>
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
                  {isEditMode ? 'Edit Contact' : 'Create Contact'}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-field"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number (E.164)</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+1234567890"
                    className="input-field"
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
                    className="btn-primary flex-1"
                  >
                    {submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Contact' : 'Create Contact')}
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
