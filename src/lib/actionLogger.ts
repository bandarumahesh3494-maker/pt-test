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
  performedBy,
  realm_id,
  user_id
}: LogActionParams): Promise<void> => {
  try {
    const { error } = await supabase.from('action_history').insert({
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
      performed_by: performedBy || null,
      realm_id: realm_id,
      user_id: realm_id
    });

    if (error) {
      console.error('Failed to log action:', error);
    }
  } catch (err) {
    console.error('Error logging action:', err);
  }
};
