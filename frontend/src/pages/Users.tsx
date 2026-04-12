import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getClients, type User, type UserCreate, type UserUpdate, type Client } from '../api/client';
import { useToast } from '../components/Toast';
import { Plus, RefreshCw, User as UserIcon, X, Pencil, Trash2, Shield, Mail } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreate>({ email: '', password: '', role: 'client', client_id: undefined });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, clientsData] = await Promise.all([
        getUsers(),
        getClients(),
      ]);
      setUsers(usersData);
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to load data', err);
      showToast('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return '-';
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || clientId.slice(0, 8);
  };

  const openCreateModal = () => {
    setFormData({ email: '', password: '', role: 'client', client_id: undefined });
    setEditingUser(null);
    setIsEditMode(false);
    setShowForm(true);
  };

  const openEditModal = (user: User) => {
    setFormData({ 
      email: user.email, 
      password: '', 
      role: user.role, 
      client_id: user.client_id || undefined 
    });
    setEditingUser(user);
    setIsEditMode(true);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setIsEditMode(false);
    setEditingUser(null);
    setFormData({ email: '', password: '', role: 'client', client_id: undefined });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const userData: UserCreate = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        client_id: formData.role === 'admin' ? undefined : formData.client_id,
      };
      const created = await createUser(userData);
      setUsers([...users, created]);
      closeModal();
      showToast('success', 'User created successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const message = error.response?.data?.detail || 'Failed to create user';
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const userData: UserUpdate = {
        email: formData.email,
        role: formData.role,
        client_id: formData.role === 'admin' ? null : (formData.client_id || null),
      };
      if (formData.password) {
        userData.password = formData.password;
      }
      const updated = await updateUser(editingUser.id, userData);
      setUsers(users.map(u => u.id === editingUser.id ? updated : u));
      closeModal();
      showToast('success', 'User updated successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const message = error.response?.data?.detail || 'Failed to update user';
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      showToast('success', 'User deleted successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      const message = error.response?.data?.detail || 'Failed to delete user';
      showToast('error', message);
    }
  };

  const showClientDropdown = formData.role === 'client';

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Users</h1>
            <p className="text-sm text-slate-500 mt-1">Manage user accounts and permissions</p>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading users...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="table-header">Email</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Client</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Created</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-slate-500" />
                          </div>
                          <span className="font-medium text-slate-900">{user.email}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role === 'admin' ? (
                            <Shield className="w-3.5 h-3.5" />
                          ) : (
                            <UserIcon className="w-3.5 h-3.5" />
                          )}
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="table-cell text-slate-600">
                        {user.role === 'admin' ? '-' : getClientName(user.client_id)}
                      </td>
                      <td className="table-cell">
                        <span className={user.is_active ? 'badge-success' : 'badge-neutral'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell text-slate-500 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(user)}
                            className="btn-ghost text-xs"
                            title="Edit User"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="btn-ghost text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <UserIcon className="w-8 h-8 mb-2 text-slate-300" />
                  <p>No users found</p>
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
                  {isEditMode ? 'Edit User' : 'Create User'}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password {isEditMode && <span className="text-slate-400 font-normal">(optional)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    placeholder={isEditMode ? 'Leave blank to keep current' : 'Enter password'}
                    required={!isEditMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      role: e.target.value as 'admin' | 'client',
                      client_id: e.target.value === 'admin' ? undefined : formData.client_id
                    })}
                    className="select-field"
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="client">Client</option>
                  </select>
                </div>

                {showClientDropdown && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
                    <select
                      value={formData.client_id || ''}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value || undefined })}
                      className="select-field"
                      required
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.company_name}</option>
                      ))}
                    </select>
                  </div>
                )}

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
                    {submitting 
                      ? (isEditMode ? 'Updating...' : 'Creating...') 
                      : (isEditMode ? 'Update User' : 'Create User')
                    }
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
