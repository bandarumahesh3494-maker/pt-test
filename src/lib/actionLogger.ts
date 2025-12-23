import { supabase } from './supabase';

type ActionType = 'create' | 'update' | 'delete';
type EntityType = 'task' | 'subtask' | 'sub_subtask' | 'milestone' | 'user';

interface LogActionParams {
  actionType: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  details?: Record<string, any>;
  performedBy?: string;
}

export const logAction = async ({
  actionType,
  entityType,
  entityId,
  entityName,
  details = {},
  performedBy
}: LogActionParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('No user found, cannot log action');
      return;
    }

    const { error } = await supabase.from('action_history').insert({
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
      performed_by: performedBy || null,
      user_id: user.id
    });

    if (error) {
      console.error('Failed to log action:', error);
    }
  } catch (err) {
    console.error('Error logging action:', err);
  }
};
