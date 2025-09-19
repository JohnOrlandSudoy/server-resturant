import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Shield,
  CreditCard,
  ChefHat
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { User, AdminUpdateUserData, UserRole } from '../../types/auth';
import AdminUserCreation from './AdminUserCreation';

const UserManagement: React.FC = () => {
  console.log('UserManagement: Component is rendering');
  const { getAllUsers, updateUser, deleteUser, isLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<AdminUpdateUserData>();

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search and role
  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, filterRole]);

  const fetchUsers = async () => {
    try {
      setError('');
      console.log('UserManagement: Fetching users from API...');
      
      const result = await getAllUsers();
      
      if (result.success && result.data) {
        console.log('UserManagement: Users fetched successfully:', result.data);
        setUsers(result.data);
      } else {
        console.log('UserManagement: Failed to fetch users:', result.message);
        setError(result.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('UserManagement: Error fetching users:', error);
      setError('Failed to fetch users. Please check your connection and try again.');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setValue('username', user.username);
    setValue('email', user.email);
    setValue('firstName', user.firstName);
    setValue('lastName', user.lastName);
    setValue('role', user.role);
    setValue('phone', user.phone || '');
    setValue('isActive', user.isActive);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (data: AdminUpdateUserData) => {
    if (!editingUser) return;

    try {
      setError('');
      setSuccess('');
      
      const result = await updateUser(editingUser.id, data);
      
      if (result.success) {
        setSuccess(result.message);
        setShowEditModal(false);
        setEditingUser(null);
        reset();
        fetchUsers(); // Refresh the list
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Update failed');
      }
    } catch (error) {
      setError('Update failed. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const result = await deleteUser(userId);
      
      if (result.success) {
        setSuccess(result.message);
        fetchUsers(); // Refresh the list
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Delete failed');
      }
    } catch (error) {
      setError('Delete failed. Please try again.');
    }
  };

  const handleUserCreated = () => {
    setShowCreateModal(false);
    fetchUsers(); // Refresh the list
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'cashier':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'kitchen':
        return <ChefHat className="h-4 w-4 text-green-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cashier':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'kitchen':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage system users and their permissions</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              console.log('=== AUTH DEBUG INFO ===');
              console.log('Token:', localStorage.getItem('authToken'));
              console.log('User Data:', localStorage.getItem('userData'));
              console.log('All localStorage:', Object.keys(localStorage).reduce((acc, key) => {
                acc[key] = localStorage.getItem(key);
                return acc;
              }, {} as any));
            }}
            className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 text-sm"
          >
            Debug Auth
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors duration-200"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by name, username, or email..."
              />
            </div>
          </div>
          <div>
            <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              id="role-filter"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="cashier">Cashier</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Users ({filteredUsers.length})
          </h3>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{user.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(user.role)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors duration-200"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <AdminUserCreation 
                onUserCreated={handleUserCreated}
                onClose={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Edit className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Edit User</h2>
                    <p className="text-gray-600">Update user information and permissions</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    reset();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleUpdateUser)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="edit-firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      id="edit-firstName"
                      type="text"
                      {...register('firstName', { required: 'First name is required' })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.firstName ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="edit-lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      id="edit-lastName"
                      type="text"
                      {...register('lastName', { required: 'Last name is required' })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.lastName ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    id="edit-username"
                    type="text"
                    {...register('username', { required: 'Username is required' })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.username ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    {...register('phone')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    id="edit-role"
                    {...register('role', { required: 'Role is required' })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.role ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="admin">Admin</option>
                    <option value="cashier">Cashier</option>
                    <option value="kitchen">Kitchen</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('isActive')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Active User</span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                      reset();
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4" />
                        <span>Update User</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
