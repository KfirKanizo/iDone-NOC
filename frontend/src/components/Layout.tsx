import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCog,
  Phone, 
  FileText, 
  LogOut,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const adminNavItems = [
  { path: '/dashboard', label: 'Incidents', icon: LayoutDashboard },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/users', label: 'Users', icon: UserCog },
  { path: '/contacts', label: 'Contacts', icon: Phone },
  { path: '/policies', label: 'Policies', icon: FileText },
];

const clientNavItems = [
  { path: '/portal/incidents', label: 'Incidents', icon: LayoutDashboard },
  { path: '/portal/contacts', label: 'Contacts', icon: Phone },
  { path: '/portal/policies', label: 'Policies', icon: FileText },
  { path: '/portal/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const navItems = isAdmin ? adminNavItems : clientNavItems;

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Fixed Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50">
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <img src="/images/logo.jpg" alt="iDone NOC" className="h-10 w-auto object-contain" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600/10 text-primary-400'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Area */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm text-slate-400 truncate">{user?.email}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-4">
        {children}
      </main>
    </div>
  );
}
