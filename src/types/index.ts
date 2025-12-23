export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
}

export interface Task {
  id: string;
  name: string;
  category: 'dev' | 'test' | 'infra' | 'support';
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  name: string;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubSubtask {
  id: string;
  subtask_id: string;
  name: string;
  assigned_to: string | null;
  order_index: number;
  created_by: string | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  subtask_id: string | null;
  sub_subtask_id: string | null;
  milestone_date: string;
  milestone_text: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupedData {
  task: Task;
  subtasks: Array<{
    subtask: Subtask;
    assignedUser: User | null;
    milestones: Milestone[];
    subSubtasks: Array<{
      subSubtask: SubSubtask;
      assignedUser: User | null;
      milestones: Milestone[];
    }>;
  }>;
}
