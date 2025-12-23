import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

import { Dashboard } from './components/Dashboard';
import { CalendarDashboard } from './components/CalendarDashboard';
import { EngineerBreakdownDashboard } from './components/EngineerBreakdownDashboard';
import { KanbanDashboard } from './components/KanbanDashboard';
import { EngineerPerformanceDashboard } from './components/EngineerPerformanceDashboard';
import { TaskDelayDashboard } from './components/TaskDelayDashboard';
import { GanttChartDashboard } from './components/GanttChartDashboard';
import { TaskListDashboard } from './components/TaskListDashboard';
import { ConfigDashboard } from './components/ConfigDashboard';
import { HistoryDashboard } from './components/HistoryDashboard';
import { ResourceAnalysisDashboard } from './components/ResourceAnalysisDashboard';
import { ThemeSelector } from './components/ThemeSelector';

import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';

import {
  LayoutGrid,
  CalendarDays,
  Users,
  Kanban,
  TrendingDown,
  AlertCircle,
  Settings,
  BarChart3,
  List,
  History,
  UserCheck
} from 'lucide-react';

type ViewMode =
  | 'timeline'
  | 'calendar'
  | 'engineer'
  | 'kanban'
  | 'engineer-performance'
  | 'task-delay'
  | 'gantt'
  | 'task-list'
  | 'history'
  | 'resource-analysis'
  | 'config';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [authReady, setAuthReady] = useState(false);

  const { colors } = useTheme();
  const { userProfile } = useAuth();

  /**
   * 🔑 Restore Supabase session from URL (token handoff)
   */
  useEffect(() => {
    async function restoreSession() {
      const params = new URLSearchParams(window.location.search);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        // 🔒 Remove tokens from URL
        window.history.replaceState({}, '', '/');
      }

      setAuthReady(true);
    }

    restoreSession();
  }, []);

  /**
   * ⏳ Wait until auth is restored
   */
  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Loading Project Tracker…
      </div>
    );
  }

  /**
   * 🚫 If user profile is still missing → block app
   * (optional but recommended)
   */
  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Unauthorized
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg}`}>
      {/* HEADER */}
      <div className={`${colors.headerBg} border-b ${colors.border} px-6 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">

            <HeaderButton icon={LayoutGrid} label="Timeline" active={viewMode === 'timeline'} onClick={() => setViewMode('timeline')} />
            <HeaderButton icon={CalendarDays} label="Calendar" active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')} />
            <HeaderButton icon={Users} label="Users Breakdown" active={viewMode === 'engineer'} onClick={() => setViewMode('engineer')} />
            <HeaderButton icon={Kanban} label="Kanban Board" active={viewMode === 'kanban'} onClick={() => setViewMode('kanban')} />
            <HeaderButton icon={BarChart3} label="Gantt" active={viewMode === 'gantt'} onClick={() => setViewMode('gantt')} />
            <HeaderButton icon={List} label="Tasks" active={viewMode === 'task-list'} onClick={() => setViewMode('task-list')} />
            <HeaderButton icon={TrendingDown} label="Performance" active={viewMode === 'engineer-performance'} onClick={() => setViewMode('engineer-performance')} />
            <HeaderButton icon={AlertCircle} label="Delays" active={viewMode === 'task-delay'} onClick={() => setViewMode('task-delay')} />
            <HeaderButton icon={History} label="History" active={viewMode === 'history'} onClick={() => setViewMode('history')} />
            <HeaderButton icon={UserCheck} label="Resources" active={viewMode === 'resource-analysis'} onClick={() => setViewMode('resource-analysis')} />

          </div>

          <div className="flex items-center gap-3">
            <div className="text-white text-sm">
              {userProfile.full_name}{' '}
              <span className="text-gray-400">({userProfile.role})</span>
            </div>
            <ThemeSelector />
            <HeaderButton icon={Settings} label="Config" active={viewMode === 'config'} onClick={() => setViewMode('config')} />
          </div>
        </div>
      </div>

      {/* DASHBOARDS */}
      {viewMode === 'timeline' && <Dashboard />}
      {viewMode === 'calendar' && <CalendarDashboard />}
      {viewMode === 'engineer' && <EngineerBreakdownDashboard />}
      {viewMode === 'kanban' && <KanbanDashboard />}
      {viewMode === 'gantt' && <GanttChartDashboard />}
      {viewMode === 'task-list' && <TaskListDashboard />}
      {viewMode === 'engineer-performance' && <EngineerPerformanceDashboard />}
      {viewMode === 'task-delay' && <TaskDelayDashboard />}
      {viewMode === 'history' && <HistoryDashboard />}
      {viewMode === 'resource-analysis' && <ResourceAnalysisDashboard />}
      {viewMode === 'config' && <ConfigDashboard />}
    </div>
  );
}

/**
 * 🔘 Reusable header button
 */
function HeaderButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export default App;
