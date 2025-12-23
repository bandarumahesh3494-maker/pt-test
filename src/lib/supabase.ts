import { createClient } from '@supabase/supabase-js';
// import.meta.env.VITE_SUPABASE_URL ||
// import.meta.env.VITE_SUPABASE_ANON_KEY ||
// const supabaseUrl =  'https://xofpdygiyypubkjyyijr.supabase.co';
// const supabaseAnonKey =  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZnBkeWdpeXlwdWJranl5aWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzkwMDIsImV4cCI6MjA4MDQ1NTAwMn0.izNmcZvwhDma6dEY_YsjFWga3yg07n4MlZve4yHgGy8';
const supabaseUrl = 'http://localhost:8000';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYwMjE0ODk3LCJleHAiOjE5ODM4MTI5OTZ9.qxNXXWRHmEUR4V91j9uP0vvkAtJHVX75jMgoJFMkjS4'
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY );
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { 
          id: string;
          email: string; 
          full_name: string;
          role: 'engineer' | 'lead';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'engineer' | 'lead';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'engineer' | 'lead';
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          name: string;
          category: 'dev' | 'test' | 'infra' | 'support';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: 'dev' | 'test' | 'infra' | 'support';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: 'dev' | 'test' | 'infra' | 'support';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          name: string;
          assigned_to: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          name: string;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          name?: string;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      milestones: {
        Row: {
          id: string;
          subtask_id: string;
          milestone_date: string;
          milestone_text: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subtask_id: string;
          milestone_date: string;
          milestone_text: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subtask_id?: string;
          milestone_date?: string;
          milestone_text?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
