import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/actionLogger';

interface AddSubSubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtaskId: string;
  subtaskName: string;
}

export const AddSubSubtaskModal: React.FC<AddSubSubtaskModalProps> = ({
  isOpen,
  onClose,
  subtaskId,
  subtaskName
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const { data: existingSubSubtasks } = await supabase
        .from('sub_subtasks')
        .select('order_index')
        .eq('subtask_id', subtaskId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingSubSubtasks && existingSubSubtasks.length > 0
        ? existingSubSubtasks[0].order_index + 1
        : 0;

      const { data: subSubData, error: insertError } = await supabase
        .from('sub_subtasks')
        .insert({
          subtask_id: subtaskId,
          name,
          order_index: nextOrderIndex,
          created_by: null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (subSubData && subtaskName.toUpperCase() === 'PLANNED') {
        await logAction({
          actionType: 'create',
          entityType: 'sub_subtask',
          entityId: subSubData.id,
          entityName: name,
          details: {
            subtask_name: subtaskName,
            order_index: nextOrderIndex
          },
        });
      }

      setName('');
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
          <h3 className="text-xl font-semibold text-white">Add Sub-Subtask to {subtaskName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sub-Subtask Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Component A, API endpoint"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              {loading ? 'Adding...' : 'Add Sub-Subtask'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
