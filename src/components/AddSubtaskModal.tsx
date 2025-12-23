import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/actionLogger';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

interface AddSubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  users: User[];
}

export const AddSubtaskModal: React.FC<AddSubtaskModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskName,
  users
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      if (!user) throw new Error('User not authenticated');

      const { data: subtaskData, error: insertError } = await supabase
        .from('subtasks')
        .insert({
          task_id: taskId,
          name,
          assigned_to: assignedTo || null,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (subtaskData && name.toUpperCase() === 'PLANNED') {
        const assignedUser = users.find(u => u.id === assignedTo);
        await logAction({
          actionType: 'create',
          entityType: 'subtask',
          entityId: subtaskData.id,
          entityName: name,
          details: {
            task_name: taskName,
            assigned_to: assignedUser?.full_name || 'Unassigned'
          },
        });
      }

      setName('');
      setAssignedTo('');
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
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">Add Subtask to {taskName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subtask Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., UI, Backend, PLANNED"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assign To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.email} ({u.role})
                </option>
              ))}
            </select>
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
              {loading ? 'Adding...' : 'Add Subtask'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
