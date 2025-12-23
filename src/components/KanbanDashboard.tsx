import React, { useMemo, useState } from 'react';
import { Calendar, Filter, Eye, EyeOff } from 'lucide-react';
import { useTrackerData } from '../hooks/useTrackerData';
import { useConfig } from '../hooks/useConfig';
import { useTheme } from '../contexts/ThemeContext';
import { Milestone, Task, Subtask, SubSubtask } from '../types';

interface KanbanCard {
  milestone: Milestone;
  taskName: string;
  subtaskName: string;
  subSubtaskName?: string;
  assignedUserName?: string;
}

const COLOR_PALETTE = [
  'bg-blue-600',
  'bg-teal-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-orange-600',
  'bg-green-600',
  'bg-emerald-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-rose-600'
];

export const KanbanDashboard: React.FC = () => {
  const { groupedData, users, loading, error } = useTrackerData();
  const { colors } = useTheme();
  const { milestoneOptions, loading: configLoading } = useConfig();
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all');
  const [hideClosedTasks, setHideClosedTasks] = useState(false);

  const columns = useMemo(() => {
    return milestoneOptions.map((option, index) => ({
      id: option.value,
      label: option.label,
      color: COLOR_PALETTE[index % COLOR_PALETTE.length]
    }));
  }, [milestoneOptions]);

  const isTaskClosed = (subtasks: any[]) => {
    return subtasks.some(st =>
      st.milestones.some((m: any) => m.milestone_text.toUpperCase() === 'CLOSED')
    );
  };

  const kanbanData = useMemo(() => {
    const columnsData: Record<string, KanbanCard[]> = {};
    columns.forEach(col => {
      columnsData[col.id] = [];
    });

    groupedData
      .filter(({ task, subtasks }) => {
        if (hideClosedTasks) {
          return !isTaskClosed(subtasks);
        }
        return true;
      })
      .forEach(({ task, subtasks }) => {
      subtasks.forEach(({ subtask, assignedUser, milestones, subSubtasks }) => {
        milestones.forEach(milestone => {
          const columnKey = milestone.milestone_text.toLowerCase().replace(/\s+/g, '-');
          if (columnsData[columnKey]) {
            columnsData[columnKey].push({
              milestone,
              taskName: task.name,
              subtaskName: subtask.name,
              assignedUserName: assignedUser?.full_name
            });
          }
        });

        subSubtasks.forEach(({ subSubtask, milestones: subSubMilestones }) => {
          subSubMilestones.forEach(milestone => {
            const columnKey = milestone.milestone_text.toLowerCase().replace(/\s+/g, '-');
            if (columnsData[columnKey]) {
              columnsData[columnKey].push({
                milestone,
                taskName: task.name,
                subtaskName: subtask.name,
                subSubtaskName: subSubtask.name,
                assignedUserName: assignedUser?.full_name
              });
            }
          });
        });
      });
    });

    return columnsData;
  }, [groupedData, columns, hideClosedTasks]);

  const filteredKanbanData = useMemo(() => {
    if (selectedEngineer === 'all') {
      return kanbanData;
    }

    const filteredData: Record<string, KanbanCard[]> = {};
    Object.keys(kanbanData).forEach(columnId => {
      filteredData[columnId] = kanbanData[columnId].filter(card =>
        card.assignedUserName === selectedEngineer
      );
    });

    return filteredData;
  }, [kanbanData, selectedEngineer]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading || configLoading) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center`}>
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center`}>
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} p-6`}>
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Milestone Kanban Board</h1>
          <p className={colors.textSecondary}>Track milestone progress across all stages</p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-400" />
          <label className="text-sm font-medium">Filter by Engineer:</label>
          <select
            value={selectedEngineer}
            onChange={(e) => setSelectedEngineer(e.target.value)}
            className={`${colors.bgSecondary} border ${colors.border} ${colors.text} px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="all">All Engineers</option>
            {users.map(user => (
              <option key={user.id} value={user.full_name}>
                {user.full_name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setHideClosedTasks(!hideClosedTasks)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hideClosedTasks
                ? 'bg-gray-600 hover:bg-gray-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={hideClosedTasks ? 'Show CLOSED tasks' : 'Hide CLOSED tasks'}
          >
            {hideClosedTasks ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            {hideClosedTasks ? 'Show' : 'Hide'} CLOSED
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => {
            const cards = filteredKanbanData[column.id] || [];
            return (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div className={`${colors.bgSecondary} rounded-lg border ${colors.border}`}>
                  <div className={`${column.color} text-white px-4 py-3 rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">{column.label}</h2>
                      <span className="text-sm bg-white/20 px-2 py-1 rounded">
                        {cards.length}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                    {cards.length === 0 ? (
                      <div className={`${colors.bgTertiary} border ${colors.border} rounded-lg p-4 text-center ${colors.textSecondary}`}>
                        No items
                      </div>
                    ) : (
                      cards.map((card, index) => (
                        <div
                          key={`${card.milestone.id}-${index}`}
                          className={`${colors.bgTertiary} border ${colors.border} rounded-lg p-3 hover:border-opacity-60 transition-all cursor-pointer`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                              <div className="text-xs text-blue-400">
                                {formatDate(card.milestone.milestone_date)}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="text-sm font-semibold">{card.taskName}</div>
                              <div className={`text-sm ${colors.textSecondary}`}>
                                {card.subtaskName}
                              </div>
                              {card.subSubtaskName && (
                                <div className={`text-xs ${colors.textSecondary} pl-3 border-l-2 ${colors.border}`}>
                                  {card.subSubtaskName}
                                </div>
                              )}
                            </div>

                            {card.assignedUserName && (
                              <div className="flex items-center gap-2 pt-2 border-t border-opacity-50" style={{ borderColor: 'currentColor' }}>
                                <div className={`w-6 h-6 rounded-full ${colors.accent} flex items-center justify-center text-xs text-white font-semibold`}>
                                  {card.assignedUserName.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-xs">{card.assignedUserName}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
