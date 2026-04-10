import type { ReactNode } from 'react';

export interface Policy {
  id: string;
  name: string;
}

export interface Contact {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
}

interface LogDetailItem {
  label: string;
  value: string | ReactNode;
  muted?: boolean;
}

export function renderLogDetails(
  details: Record<string, unknown>,
  actionType: string,
  policies: Policy[] = [],
  contacts: Contact[] = []
): LogDetailItem[] {
  const items: LogDetailItem[] = [];

  switch (actionType) {
    case 'INGESTED': {
      if (details.payload && typeof details.payload === 'object') {
        const payload = details.payload as Record<string, unknown>;
        if (payload.details) {
          items.push({
            label: 'Message',
            value: String(payload.details).replace(/\\n/g, '\n'),
          });
        }
      }
      if (details.policy_id) {
        const policy = policies.find(p => p.id === details.policy_id);
        items.push({
          label: 'Policy',
          value: policy ? policy.name : String(details.policy_id).slice(0, 8),
        });
      }
      if (details.client_id) {
        items.push({
          label: 'Client ID',
          value: String(details.client_id).slice(0, 8),
        });
      }
      break;
    }

    case 'EMAIL_SENT': {
      if (details.contact_id) {
        const contact = contacts.find(c => c.id === details.contact_id);
        items.push({
          label: 'Contact',
          value: contact ? contact.full_name : String(details.contact_id).slice(0, 8),
        });
      }
      if (details.email) {
        items.push({
          label: 'Email',
          value: String(details.email),
        });
      }
      if (details.sent === true) {
        items.push({
          label: 'Status',
          value: 'Sent successfully',
        });
      }
      break;
    }

    case 'CALL_INITIATED': {
      if (details.contact_id) {
        const contact = contacts.find(c => c.id === details.contact_id);
        items.push({
          label: 'Contact',
          value: contact ? contact.full_name : String(details.contact_id).slice(0, 8),
        });
      }
      if (details.phone_number) {
        items.push({
          label: 'Phone Number',
          value: String(details.phone_number),
        });
      }
      if (details.call_sid) {
        items.push({
          label: 'Call SID',
          value: String(details.call_sid),
          muted: true,
        });
      }
      break;
    }

    case 'ACKNOWLEDGED': {
      if (details.method) {
        let methodText = 'Unknown method';
        switch (details.method) {
          case 'twilio_callback':
            methodText = 'Acknowledged via Phone call';
            break;
          case 'email_button':
            methodText = 'Acknowledged via Email button';
            break;
          case 'dashboard':
            methodText = 'Acknowledged via Dashboard';
            break;
          default:
            methodText = `Acknowledged (${details.method})`;
        }
        items.push({
          label: 'Method',
          value: methodText,
        });
      }
      if (details.language) {
        items.push({
          label: 'Language',
          value: String(details.language),
        });
      }
      if (details.digits_pressed) {
        items.push({
          label: 'Digits Pressed',
          value: String(details.digits_pressed),
        });
      }
      break;
    }

    case 'RESOLVED': {
      if (details.method) {
        let methodText = 'Unknown method';
        switch (details.method) {
          case 'email_button':
            methodText = 'User resolved via Email button';
            break;
          case 'dashboard':
            methodText = 'Resolved via Dashboard';
            break;
          case 'twilio_callback':
            methodText = 'Resolved via Phone call';
            break;
          default:
            methodText = `Resolved (${details.method})`;
        }
        items.push({
          label: 'Method',
          value: methodText,
        });
      }
      if (details.contact_id) {
        const contact = contacts.find(c => c.id === details.contact_id);
        items.push({
          label: 'Resolved by',
          value: contact ? contact.full_name : String(details.contact_id).slice(0, 8),
        });
      }
      break;
    }

    default: {
      Object.entries(details).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          items.push({
            label: formatLabel(key),
            value: String(value),
          });
        }
      });
    }
  }

  return items;
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export function formatLogDetailValue(value: string | ReactNode, muted?: boolean): ReactNode {
  if (typeof value === 'string' && value.includes('\n')) {
    return (
      <span className={`whitespace-pre-wrap ${muted ? 'text-slate-400 text-xs' : 'text-slate-600'}`}>
        {value}
      </span>
    );
  }
  return (
    <span className={muted ? 'text-slate-400 text-xs' : 'text-slate-600'}>
      {value}
    </span>
  );
}
