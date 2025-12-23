import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/actionLogger';

interface EditSubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtaskId: string;
  subtaskName: string;
  onSuccess: () => void;
}

export const EditSubtaskModal: React.FC<EditSubtaskModalProps> = ({
  isOpen,
  onClose,
  subtaskId,
  subtaskName,
  onSuccess
}) => {
  const [name, setName] = useState(subtaskName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subtask name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('subtasks')
        .update({
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subtaskId);

      if (updateError) throw updateError;

      if (subtaskName.toUpperCase() === 'PLANNED') {
        await logAction({
          actionType: 'update',
          entityType: 'subtask',
          entityId: subtaskId,
          entityName: name.trim(),
          details: {
            old_name: subtaskName,
            new_name: name.trim()
          },
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating subtask:', err);
      setError(err instanceof Error ? err.message : 'Failed to update subtask');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Subtask Name</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subtask Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter subtask name"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
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
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
