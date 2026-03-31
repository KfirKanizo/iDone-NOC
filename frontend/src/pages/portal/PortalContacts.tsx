import { useEffect, useState } from 'react';
import { getPortalContacts, type PortalContact } from '../../api/portalClient';
import { useToast } from '../../components/Toast';
import { Phone, Mail, User, Globe, Activity, CheckCircle, XCircle } from 'lucide-react';

const languageLabels: Record<string, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'he-IL': 'Hebrew',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
};

export default function PortalContacts() {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<PortalContact[]>([]);
  const [loading, setLoading] = useState(true);

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
          <p className="text-sm text-slate-500 mt-1">Contacts who will be notified during incidents</p>
        </div>
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
            <p className="text-sm text-slate-400 mt-1">Contact your administrator to add escalation contacts.</p>
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
                          <XCircle className="w-3 h-3" />
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-slate-500 mb-3">About Escalation Contacts</h3>
        <p className="text-sm text-slate-600">
          These contacts are part of your organization's escalation policy. During an incident, 
          the system will automatically notify contacts in sequence based on the configured 
          escalation levels. You can view contact details here, but modifications must be 
          requested through your administrator.
        </p>
      </div>
    </div>
  );
}
