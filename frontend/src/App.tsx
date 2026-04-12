import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Clients from './pages/Clients';
import Users from './pages/Users';
import Contacts from './pages/Contacts';
import Policies from './pages/Policies';
import Layout from './components/Layout';
import PortalIncidents from './pages/portal/PortalIncidents';
import PortalIncidentDetails from './pages/portal/PortalIncidentDetails';
import PortalContacts from './pages/portal/PortalContacts';
import PortalAnalytics from './pages/portal/PortalAnalytics';
import PortalPolicies from './pages/portal/PortalPolicies';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/portal/incidents" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

function ClientRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isClient } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isClient) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

function RootRedirect() {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to={isAdmin ? '/dashboard' : '/portal/incidents'} replace />;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<RootRedirect />} />
            
            <Route
              path="/dashboard"
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <AdminRoute>
                  <Analytics />
                </AdminRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <AdminRoute>
                  <Clients />
                </AdminRoute>
              }
            />
            <Route
              path="/users"
              element={
                <AdminRoute>
                  <Users />
                </AdminRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <AdminRoute>
                  <Contacts />
                </AdminRoute>
              }
            />
            <Route
              path="/policies"
              element={
                <AdminRoute>
                  <Policies />
                </AdminRoute>
              }
            />
            
            <Route
              path="/portal"
              element={<Navigate to="/portal/incidents" replace />}
            />
            <Route
              path="/portal/incidents"
              element={
                <ClientRoute>
                  <PortalIncidents />
                </ClientRoute>
              }
            />
            <Route
              path="/portal/incidents/:id"
              element={
                <ClientRoute>
                  <PortalIncidentDetails />
                </ClientRoute>
              }
            />
            <Route
              path="/portal/contacts"
              element={
                <ClientRoute>
                  <PortalContacts />
                </ClientRoute>
              }
            />
            <Route
              path="/portal/policies"
              element={
                <ClientRoute>
                  <PortalPolicies />
                </ClientRoute>
              }
            />
            <Route
              path="/portal/analytics"
              element={
                <ClientRoute>
                  <PortalAnalytics />
                </ClientRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
