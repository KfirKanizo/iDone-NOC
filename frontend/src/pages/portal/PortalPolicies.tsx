import { useEffect, useState } from 'react';
import { getPortalPolicies, type PortalPolicy } from '../../api/portalClient';
import { useToast } from '../../components/Toast';
import { FileText, Clock, RefreshCw, Activity, User, Mail } from 'lucide-react';

const levelLabels = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

export default function PortalPolicies() {
  const { showToast } = useToast();
  const [policies, setPolicies] = useState<PortalPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await getPortalPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load policies', err);
      showToast('error', 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const getContactForLevel = (policy: PortalPolicy, level: number) => {
    const contacts = [
      policy.level_0_contact,
      policy.level_1_contact,
      policy.level_2_contact,
      policy.level_3_contact,
      policy.level_4_contact,
      policy.level_5_contact,
    ];
    return contacts[level];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Escalation Policies</h1>
          <p className="text-sm text-slate-500 mt-1">View your incident escalation workflows</p>
        </div>
      </div>

      {loading ? (
        <div className="card p-12">
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Activity className="w-5 h-5 animate-spin" />
            <span>Loading policies...</span>
          </div>
        </div>
      ) : policies.length === 0 ? (
        <div className="card p-12">
          <div className="flex flex-col items-center justify-center text-slate-500">
            <FileText className="w-8 h-8 mb-2 text-slate-300" />
            <p>No escalation policies found</p>
            <p className="text-sm text-slate-400 mt-1">Contact your administrator to set up escalation policies.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map((policy) => (
            <div key={policy.id} className="card overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{policy.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <RefreshCw className="w-3 h-3" />
                          {policy.max_retries_per_level} retries per level
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {policy.retry_delay_seconds}s delay
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Escalation Levels</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {levelLabels.map((label, level) => {
                    const contact = getContactForLevel(policy, level);
                    return (
                      <div 
                        key={level}
                        className={`p-3 rounded-lg border ${
                          contact 
                            ? 'bg-white border-slate-200' 
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            contact 
                              ? 'bg-primary-100 text-primary-700' 
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {label}
                          </span>
                        </div>
                        {contact ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="font-medium">{contact.full_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No contact assigned</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                <h4 className="text-xs font-medium text-slate-500 mb-1">TTS Message Template</h4>
                <code className="text-xs text-slate-600 bg-white px-2 py-1 rounded border block truncate">
                  {policy.tts_message_template}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}