import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/actionLogger';
import { Milestone } from '../types';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtaskId?: string;
  subSubtaskId?: string;
  subtaskName: string;
  date: string;
  existingMilestones: Milestone[];
  onDataChange?: () => void;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  onClose,
  subtaskId,
  subSubtaskId,
  subtaskName,
  date,
  existingMilestones,
  onDataChange
}) => {
  const [milestoneText, setMilestoneText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const milestonesForDate = existingMilestones.filter(m => m.milestone_date === date);

  useEffect(() => {
    if (isOpen) {
      setMilestoneText('');
      setError('');
    }
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const { data: milestoneData, error: insertError } = await supabase
        .from('milestones')
        .insert({
          subtask_id: subtaskId || null,
          sub_subtask_id: subSubtaskId || null,
          milestone_date: date,
          milestone_text: milestoneText,
          created_by: null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (milestoneData && subtaskName.toUpperCase() === 'PLANNED') {
        await logAction({
          actionType: 'create',
          entityType: 'milestone',
          entityId: milestoneData.id,
          entityName: milestoneText,
          details: {
            subtask_name: subtaskName,
            date,
            type: subSubtaskId ? 'sub_subtask' : 'subtask'
          },
        });
      }

      // If this is a sub-subtask milestone, update parent subtask milestone to longest pole
      if (subSubtaskId) {
        await updateParentMilestone(subSubtaskId, milestoneText);
      }

      setMilestoneText('');
      onDataChange?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateParentMilestone = async (subSubtaskId: string, milestoneText: string) => {
    // Get the parent subtask ID
    const { data: subSubtask } = await supabase
      .from('sub_subtasks')
      .select('subtask_id')
      .eq('id', subSubtaskId)
      .single();

    if (subSubtask) {
      const parentSubtaskId = subSubtask.subtask_id;

      // Get all sub-subtasks for this parent
      const { data: allSubSubtasks } = await supabase
        .from('sub_subtasks')
        .select('id')
        .eq('subtask_id', parentSubtaskId);

      if (allSubSubtasks && allSubSubtasks.length > 0) {
        const subSubtaskIds = allSubSubtasks.map(s => s.id);

        // Get all milestones for these sub-subtasks with the same milestone_text
        const { data: allMilestones } = await supabase
          .from('milestones')
          .select('milestone_date, milestone_text')
          .in('sub_subtask_id', subSubtaskIds)
          .eq('milestone_text', milestoneText);

        if (allMilestones && allMilestones.length > 0) {
          // Find the latest date for this milestone type
          const latestDate = allMilestones.reduce((latest, m) => {
            return m.milestone_date > latest ? m.milestone_date : latest;
          }, allMilestones[0].milestone_date);

          // Check if parent subtask already has this milestone
          const { data: existingParentMilestone } = await supabase
            .from('milestones')
            .select('id, milestone_date')
            .eq('subtask_id', parentSubtaskId)
            .is('sub_subtask_id', null)
            .eq('milestone_text', milestoneText)
            .maybeSingle();

          if (existingParentMilestone) {
            // Update existing milestone if the new date is different
            if (latestDate !== existingParentMilestone.milestone_date) {
              await supabase
                .from('milestones')
                .update({ milestone_date: latestDate })
                .eq('id', existingParentMilestone.id);
            }
          } else {
            // Create new milestone for parent subtask
            await supabase
              .from('milestones')
              .insert({
                subtask_id: parentSubtaskId,
                sub_subtask_id: null,
                milestone_date: latestDate,
                milestone_text: milestoneText,
                created_by: null
              });
          }
        }
      }
    }
  };

  const handleDelete = async (milestoneId: string) => {
    try {
      // Get the milestone details before deleting
      const { data: milestone } = await supabase
        .from('milestones')
        .select('sub_subtask_id, milestone_text, milestone_date')
        .eq('id', milestoneId)
        .single();

      const { error: deleteError } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId);

      if (deleteError) throw deleteError;

      if (milestone && subtaskName.toUpperCase() === 'PLANNED') {
        await logAction({
          actionType: 'delete',
          entityType: 'milestone',
          entityId: milestoneId,
          entityName: milestone.milestone_text,
          details: {
            subtask_name: subtaskName,
            date: milestone.milestone_date,
            type: milestone.sub_subtask_id ? 'sub_subtask' : 'subtask'
          },
        });
      }

      // If this was a sub-subtask milestone, recalculate parent milestone
      if (milestone?.sub_subtask_id) {
        await recalculateParentMilestone(milestone.sub_subtask_id, milestone.milestone_text);
      }

      onDataChange?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const recalculateParentMilestone = async (subSubtaskId: string, milestoneText: string) => {
    // Get the parent subtask ID
    const { data: subSubtask } = await supabase
      .from('sub_subtasks')
      .select('subtask_id')
      .eq('id', subSubtaskId)
      .single();

    if (subSubtask) {
      const parentSubtaskId = subSubtask.subtask_id;

      // Get all sub-subtasks for this parent
      const { data: allSubSubtasks } = await supabase
        .from('sub_subtasks')
        .select('id')
        .eq('subtask_id', parentSubtaskId);

      if (allSubSubtasks && allSubSubtasks.length > 0) {
        const subSubtaskIds = allSubSubtasks.map(s => s.id);

        // Get all remaining milestones for these sub-subtasks with the same milestone_text
        const { data: remainingMilestones } = await supabase
          .from('milestones')
          .select('milestone_date')
          .in('sub_subtask_id', subSubtaskIds)
          .eq('milestone_text', milestoneText);

        // Get parent milestone
        const { data: parentMilestone } = await supabase
          .from('milestones')
          .select('id')
          .eq('subtask_id', parentSubtaskId)
          .is('sub_subtask_id', null)
          .eq('milestone_text', milestoneText)
          .maybeSingle();

        if (remainingMilestones && remainingMilestones.length > 0) {
          // Find the latest date among remaining milestones
          const latestDate = remainingMilestones.reduce((latest, m) => {
            return m.milestone_date > latest ? m.milestone_date : latest;
          }, remainingMilestones[0].milestone_date);

          // Update parent milestone to new latest date
          if (parentMilestone) {
            await supabase
              .from('milestones')
              .update({ milestone_date: latestDate })
              .eq('id', parentMilestone.id);
          }
        } else {
          // No more sub-subtask milestones with this text, delete parent milestone
          if (parentMilestone) {
            await supabase
              .from('milestones')
              .delete()
              .eq('id', parentMilestone.id);
          }
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-white">{subtaskName}</h3>
            <p className="text-sm text-gray-400 mt-1">{date}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {milestonesForDate.length > 0 && (
            <div className="mb-6 space-y-2">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Existing Milestones</h4>
              {milestonesForDate.map(milestone => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded"
                >
                  <span className="text-white text-sm">{milestone.milestone_text}</span>
                  <button
                    onClick={() => handleDelete(milestone.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Add Milestone
              </label>
              <input
                type="text"
                value={milestoneText}
                onChange={(e) => setMilestoneText(e.target.value)}
                required
                placeholder="e.g., Dev complete, DEV merged"
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
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
