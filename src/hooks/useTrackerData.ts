import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Task,
  Subtask,
  SubSubtask,
  Milestone,
  User,
  GroupedData
} from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useTrackerData = () => {
  const { currentRealm } = useAuth();

  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subSubtasks, setSubSubtasks] = useState<SubSubtask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    // 🛑 HARD GUARD: wait for realm
    if (!currentRealm?.id) {
      console.log('[Tracker] Waiting for currentRealm...');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoading(false);
        return;
      }

      setUser(user);

      console.log('[Tracker] Fetching data for realm:', currentRealm.id);

      const [
        tasksRes,
        subtasksRes,
        subSubtasksRes,
        milestonesRes,
        usersRes
      ] = await Promise.all([
        supabase.from('tasks').select('*').order('category', { ascending: true }),
        supabase.from('subtasks').select('*'),
        supabase
          .from('sub_subtasks')
          .select('*')
          .order('order_index', { ascending: true }),
        supabase.from('milestones').select('*'),
        supabase
          .from('profiles')
          .select('*')
          .eq('realm_id', currentRealm.id)
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (subtasksRes.error) throw subtasksRes.error;
      if (subSubtasksRes.error) throw subSubtasksRes.error;
      if (milestonesRes.error) throw milestonesRes.error;
      if (usersRes.error) throw usersRes.error;

      setTasks(tasksRes.data || []);
      setSubtasks(subtasksRes.data || []);
      setSubSubtasks(subSubtasksRes.data || []);
      setMilestones(milestonesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err: any) {
      console.error('[Tracker] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentRealm?.id) return;

    fetchData();

    const channel = supabase.channel('tracker_changes');

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_subtasks' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRealm?.id]);

  const groupedData: GroupedData[] = tasks.map(task => ({
    task,
    subtasks: subtasks
      .filter(st => st.task_id === task.id)
      .map(subtask => ({
        subtask,
        assignedUser: users.find(u => u.id === subtask.assigned_to) || null,
        milestones: milestones.filter(m => m.subtask_id === subtask.id),
        subSubtasks: subSubtasks
          .filter(sst => sst.subtask_id === subtask.id)
          .map(subSubtask => ({
            subSubtask,
            assignedUser: users.find(u => u.id === subSubtask.assigned_to) || null,
            milestones: milestones.filter(
              m => m.sub_subtask_id === subSubtask.id
            )
          }))
      }))
  }));

  return {
    tasks,
    subtasks,
    milestones,
    users,
    groupedData,
    loading,
    error,
    refetch: fetchData
  };
};
