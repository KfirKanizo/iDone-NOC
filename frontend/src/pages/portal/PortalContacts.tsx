import { useEffect, useState } from 'react';
import { 
  getPortalContacts, 
  createPortalContact, 
  updatePortalContact, 
  deletePortalContact,
  type PortalContact 
} from '../../api/portalClient';
import { useToast } from '../../components/Toast';
import { Phone, Mail, User, Globe, Activity, CheckCircle, X, Plus, Pencil, Trash2 } from 'lucide-react';

const languageLabels: Record<string, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'he-IL': 'Hebrew',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
};

interface ContactFormData {
  full_name: string;
  email: string;
  phone_number: string;
  language: string;
}

const emptyForm: ContactFormData = {
  full_name: '',
  email: '',
  phone_number: '',
  language: 'en-US',
};

export default function PortalContacts() {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<PortalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<PortalContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await getPortalContacts();
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts', err);
      showToast('error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditModal = (contact: PortalContact) => {
    setEditingContact(contact);
    setFormData({
      full_name: contact.full_name,
      email: contact.email,
      phone_number: contact.phone_number,
      language: contact.language,
    });
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingContact(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingContact) {
        await updatePortalContact(editingContact.id, formData);
        showToast('success', 'Contact updated successfully');
      } else {
        await createPortalContact(formData);
        showToast('success', 'Contact created successfully');
      }
      closeModal();
      loadContacts();
    } catch (err) {
      console.error('Failed to save contact', err);
      showToast('error', 'Failed to save contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await deletePortalContact(id);
      showToast('success', 'Contact deleted successfully');
      loadContacts();
    } catch (err) {
      console.error('Failed to delete contact', err);
      showToast('error', 'Failed to delete contact');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-primary-100 text-primary-700',
      'bg-emerald-100 text-emerald-700',
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Escalation Contacts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage contacts who will be notified during incidents</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All Contacts</h2>
          <span className="text-sm text-slate-500">{contacts.length} contacts</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-slate-500">
              <Activity className="w-5 h-5 animate-spin" />
              <span>Loading contacts...</span>
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <User className="w-8 h-8 mb-2 text-slate-300" />
            <p>No contacts found</p>
            <p className="text-sm text-slate-400 mt-1">Click "Add Contact" to create your first contact.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {contacts.map((contact) => (
              <div 
                key={contact.id} 
                className={`p-4 rounded-xl border ${
                  contact.is_active 
                    ? 'bg-white border-slate-200 hover:border-primary-300 hover:shadow-md' 
                    : 'bg-slate-50 border-slate-100 opacity-60'
                } transition-all duration-200`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${getAvatarColor(contact.full_name)}`}>
                    {getInitials(contact.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{contact.full_name}</h3>
                      {contact.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <X className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{contact.phone_number}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{languageLabels[contact.language] || contact.language}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="btn-ghost text-xs flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="btn-ghost text-xs text-red-600 flex items-center gap-1 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button onClick={closeModal} className="btn-ghost p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="input-field w-full"
                  placeholder="+1234567890"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="select-field w-full"
                >
                  {Object.entries(languageLabels).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  {submitting ? 'Saving...' : editingContact ? 'Update Contact' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}