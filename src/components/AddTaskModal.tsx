import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/actionLogger';
import { useAuth } from '../contexts/AuthContext';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'dev' | 'test' | 'infra' | 'support'>('dev');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      if (!user) throw new Error('User not authenticated');

      const { data: taskData, error: insertError } = await supabase
        .from('tasks')
        .insert({
          name,
          category,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!taskData) throw new Error('Failed to create task');

      const subtasksToCreate = [
        { name: 'PLANNED', task_id: taskData.id, assigned_to: null, created_by: user.id },
        { name: 'subtask1', task_id: taskData.id, assigned_to: null, created_by: user.id },
        { name: 'subtask2', task_id: taskData.id, assigned_to: null, created_by: user.id }
      ];

      const { error: subtasksError } = await supabase
        .from('subtasks')
        .insert(subtasksToCreate);

      if (subtasksError) throw subtasksError;

      await logAction({
        actionType: 'create',
        entityType: 'task',
        entityId: taskData.id,
        entityName: name,
        details: { category },
      });

      setName('');
      setCategory('dev');
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
          <h3 className="text-xl font-semibold text-white">Add New Task</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Task Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., DBInsights"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dev">DEV</option>
              <option value="test">TEST</option>
              <option value="infra">INFRA</option>
              <option value="support">SUPPORT</option>
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
              {loading ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
