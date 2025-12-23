import React, { useState } from 'react';
import { X, UserPlus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/actionLogger';
import type { User } from '../types';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({ isOpen, onClose, users }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const finalEmail = email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`;

      const { data: userData, error: insertError } = await supabase
        .from('users')
        .insert({
          full_name: fullName,
          email: finalEmail,
          role
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (userData) {
        await logAction({
          actionType: 'create',
          entityType: 'user',
          entityId: userData.id,
          entityName: fullName,
          details: {
            email: finalEmail,
            role
          },
        });
      }

      setFullName('');
      setEmail('');
      setRole('user');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-500" />
            <h3 className="text-xl font-semibold text-white">Manage Users/Admins</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {users.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-gray-400" />
                <h4 className="text-lg font-semibold text-white">Existing Team Members ({users.length})</h4>
              </div>
              <div className="bg-gray-900 rounded-lg border border-gray-700 max-h-64 overflow-y-auto">
                <div className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <div key={user.id} className="px-4 py-3 hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{user.full_name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                            : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Add New Team Member</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="e.g., John Doe"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., john.doe@company.com"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={role === 'user'}
                  onChange={(e) => setRole(e.target.value as 'user')}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="text-white">User</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={(e) => setRole(e.target.value as 'admin')}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="text-white">Admin</span>
              </label>
            </div>
          </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
