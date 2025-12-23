import React, { useMemo } from 'react';
import { useTrackerData } from '../hooks/useTrackerData';
import { Milestone } from '../types';
import { Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useConfig } from '../hooks/useConfig';

interface SubtaskDelay {
  subtaskName: string;
  assignedTo: string | null;
  milestones: {
    milestoneName: string;
    plannedDate: string | null;
    actualDate: string | null;
    daysDelay: number | null;
  }[];
  averageDelay: number;
  worstDelay: number;
}

interface TaskDelay {
  taskName: string;
  category: string;
  subtasks: SubtaskDelay[];
  averageDelay: number;
  totalDelayed: number;
  totalSubtasks: number;
  worstDelay: number;
}

export const TaskDelayDashboard: React.FC = () => {
  const { groupedData, loading } = useTrackerData();
  const { theme } = useTheme();
  const { categoryColors, categoryOpacity } = useConfig();

  const calculateDaysDelay = (plannedDate: string, actualDate: string): number => {
    const planned = new Date(plannedDate);
    const actual = new Date(actualDate);
    const diffTime = actual.getTime() - planned.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getLatestMilestoneDate = (subtaskData: any, milestoneName: string): string | null => {
    let latestDate: string | null = null;

    subtaskData.milestones.forEach((m: any) => {
      if (m.milestone_text === milestoneName) {
        if (!latestDate || m.milestone_date > latestDate) {
          latestDate = m.milestone_date;
        }
      }
    });

    subtaskData.subSubtasks?.forEach((sst: any) => {
      sst.milestones.forEach((m: any) => {
        if (m.milestone_text === milestoneName) {
          if (!latestDate || m.milestone_date > latestDate) {
            latestDate = m.milestone_date;
          }
        }
      });
    });

    return latestDate;
  };

  const taskDelays = useMemo<TaskDelay[]>(() => {
    return groupedData.map(group => {
      const plannedSubtask = group.subtasks.find(st => st.subtask.name.toUpperCase() === 'PLANNED');

      const plannedMilestones: { [milestoneText: string]: string } = {};
      if (plannedSubtask) {
        plannedSubtask.milestones.forEach(m => {
          plannedMilestones[m.milestone_text] = m.milestone_date;
        });
      }

      const subtasks: SubtaskDelay[] = group.subtasks
        .filter(st => st.subtask.name.toUpperCase() !== 'PLANNED' && st.subtask.name.toUpperCase() !== 'ACTUAL')
        .map(st => {
          const milestoneNames = new Set<string>();

          st.milestones.forEach(m => milestoneNames.add(m.milestone_text));
          st.subSubtasks?.forEach(sst => {
            sst.milestones.forEach(m => milestoneNames.add(m.milestone_text));
          });

          const milestones = Array.from(milestoneNames).map(milestoneName => {
            const plannedDate = plannedMilestones[milestoneName] || null;
            const actualDate = getLatestMilestoneDate(st, milestoneName);

            let daysDelay: number | null = null;
            if (plannedDate && actualDate) {
              daysDelay = calculateDaysDelay(plannedDate, actualDate);
            }

            return {
              milestoneName,
              plannedDate,
              actualDate,
              daysDelay
            };
          }).filter(m => m.plannedDate || m.actualDate);

          const delayedMilestones = milestones.filter(m => m.daysDelay !== null && m.daysDelay > 0);
          const allDelays = delayedMilestones.map(m => m.daysDelay || 0);
          const averageDelay = allDelays.length > 0
            ? allDelays.reduce((sum, delay) => sum + delay, 0) / allDelays.length
            : 0;
          const worstDelay = allDelays.length > 0 ? Math.max(...allDelays) : 0;

          return {
            subtaskName: st.subtask.name,
            assignedTo: st.assignedUser?.full_name || null,
            milestones,
            averageDelay,
            worstDelay
          };
        });

      const allDelays = subtasks.flatMap(st =>
        st.milestones.filter(m => m.daysDelay !== null && m.daysDelay > 0).map(m => m.daysDelay || 0)
      );
      const taskAverageDelay = allDelays.length > 0
        ? allDelays.reduce((sum, delay) => sum + delay, 0) / allDelays.length
        : 0;
      const taskWorstDelay = allDelays.length > 0 ? Math.max(...allDelays) : 0;
      const delayedSubtasks = subtasks.filter(st => st.worstDelay > 0);

      return {
        taskName: group.task.name,
        category: group.task.category,
        subtasks,
        averageDelay: taskAverageDelay,
        totalDelayed: delayedSubtasks.length,
        totalSubtasks: subtasks.length,
        worstDelay: taskWorstDelay
      };
    }).sort((a, b) => b.worstDelay - a.worstDelay);
  }, [groupedData]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'dev': return 'bg-blue-900/30 text-blue-300';
      case 'test': return 'bg-green-900/30 text-green-300';
      case 'infra': return 'bg-yellow-900/30 text-yellow-300';
      case 'support': return 'bg-purple-900/30 text-purple-300';
      default: return 'bg-gray-900/30 text-gray-300';
    }
  };

  const getCategoryBannerColor = (category: string): string => {
    const colorMap: { [key: string]: string } = {
      dev: categoryColors.dev,
      test: categoryColors.test,
      infra: categoryColors.infra,
      support: categoryColors.support
    };
    const opacityMap: { [key: string]: number } = {
      dev: categoryOpacity.dev,
      test: categoryOpacity.test,
      infra: categoryOpacity.infra,
      support: categoryOpacity.support
    };
    const color = colorMap[category] || '#6b7280';
    const opacity = opacityMap[category] || 1.0;
    return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };

  const getDelayColor = (worstDelay: number) => {
    if (worstDelay === 0) return 'bg-green-500';
    if (worstDelay <= 5) return 'bg-yellow-500';
    if (worstDelay <= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getDelayLabel = (worstDelay: number) => {
    if (worstDelay === 0) return 'On Track';
    if (worstDelay <= 5) return `${worstDelay}d behind`;
    if (worstDelay <= 10) return `${worstDelay}d behind`;
    return `${worstDelay}d behind`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${theme.bg} ${theme.text}`}>
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`${theme.bg} ${theme.text} min-h-screen p-6`}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Task Delay Dashboard</h1>

        {taskDelays.length === 0 ? (
          <div className={`${theme.cardBg} rounded-lg p-8 text-center ${theme.border} border`}>
            <p className={theme.mutedText}>No task data available</p>
          </div>
        ) : (
          <>
            <div className={`${theme.cardBg} rounded-lg p-6 border-4 border-blue-500 mb-6`}>
              <h2 className="text-xl font-semibold mb-4">Task Status Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {taskDelays.map((task, idx) => (
                  <div
                    key={idx}
                    className={`${getDelayColor(task.worstDelay)} rounded-lg p-4 transition-all hover:scale-105 cursor-pointer shadow-lg`}
                    title={`${task.taskName}: ${getDelayLabel(task.worstDelay)}`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-semibold text-sm truncate flex-1">
                          {task.taskName}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                          task.category === 'dev' ? 'bg-blue-700/50' :
                          task.category === 'test' ? 'bg-green-700/50' :
                          task.category === 'infra' ? 'bg-yellow-700/50' :
                          task.category === 'support' ? 'bg-purple-700/50' :
                          'bg-gray-700/50'
                        } text-white`}>
                          {task.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-white">
                        <span className="text-xs opacity-90">
                          {task.worstDelay === 0 ? '✓ On Track' : `⚠ ${task.worstDelay}d behind`}
                        </span>
                        <span className="text-xs opacity-75">
                          {task.totalDelayed}/{task.totalSubtasks} delayed
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className={theme.mutedText}>On Track</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className={theme.mutedText}>1-5 days behind</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className={theme.mutedText}>6-10 days behind</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className={theme.mutedText}>&gt;10 days behind</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
            {taskDelays.map((task, idx) => (
              <div key={idx} className={`${theme.cardBg} rounded-lg p-6 border-4 ${
                task.worstDelay === 0 ? 'border-green-500' :
                task.worstDelay <= 5 ? 'border-yellow-500' :
                task.worstDelay <= 10 ? 'border-orange-500' :
                'border-red-500'
              }`}>
                <div
                  className="flex items-center justify-between -mx-6 -mt-6 px-6 py-3 rounded-t-lg border-b-2 border-white/20 mb-4"
                  style={{ backgroundColor: getCategoryBannerColor(task.category) }}
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{task.taskName}</h2>
                    <span className="px-3 py-1 rounded text-xs font-medium uppercase bg-white/20 text-white backdrop-blur-sm">
                      {task.category}
                    </span>
                  </div>
                  <div className="text-right">
                    {task.worstDelay > 0 ? (
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-5 h-5 text-white" />
                        <span className="text-lg font-semibold text-white">
                          {task.worstDelay} days behind
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-5 h-5 text-white" />
                        <span className="text-lg font-semibold text-white">
                          On Track
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-white/80">
                      {task.totalDelayed} of {task.totalSubtasks} subtasks delayed
                    </p>
                    {task.averageDelay > 0 && (
                      <p className="text-sm text-white/80">
                        Avg Delay: {task.averageDelay.toFixed(1)} days
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {task.subtasks.map((subtask, subIdx) => (
                    <div key={subIdx} className={`border-4 rounded-lg p-4 ${
                      subtask.worstDelay === 0 ? 'border-green-400' :
                      subtask.worstDelay <= 5 ? 'border-yellow-400' :
                      subtask.worstDelay <= 10 ? 'border-orange-400' :
                      'border-red-400'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{subtask.subtaskName}</h3>
                          {subtask.assignedTo && (
                            <p className={`text-sm ${theme.mutedText}`}>Assigned to: {subtask.assignedTo}</p>
                          )}
                        </div>
                        {subtask.worstDelay > 0 && (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 font-semibold">
                              {subtask.worstDelay} days behind
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className={`${theme.border} border-b`}>
                              <th className={`text-left py-2 px-3 ${theme.mutedText} font-medium text-sm`}>Milestone</th>
                              <th className={`text-left py-2 px-3 ${theme.mutedText} font-medium text-sm`}>Planned Date</th>
                              <th className={`text-left py-2 px-3 ${theme.mutedText} font-medium text-sm`}>Actual Date</th>
                              <th className={`text-right py-2 px-3 ${theme.mutedText} font-medium text-sm`}>Days Delay</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subtask.milestones.map((milestone, milIdx) => (
                              <tr key={milIdx} className={`${theme.border} border-b last:border-b-0`}>
                                <td className="py-2 px-3 text-sm">{milestone.milestoneName}</td>
                                <td className="py-2 px-3 text-sm">
                                  {milestone.plannedDate ? (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(milestone.plannedDate).toLocaleDateString()}
                                    </div>
                                  ) : (
                                    <span className={theme.mutedText}>-</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-sm">
                                  {milestone.actualDate ? (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(milestone.actualDate).toLocaleDateString()}
                                    </div>
                                  ) : (
                                    <span className={theme.mutedText}>-</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right text-sm">
                                  {milestone.daysDelay !== null ? (
                                    <span className={milestone.daysDelay > 0 ? 'text-red-400 font-semibold' : milestone.daysDelay < 0 ? 'text-green-400' : theme.mutedText}>
                                      {milestone.daysDelay > 0 ? '+' : ''}{milestone.daysDelay}
                                    </span>
                                  ) : (
                                    <span className={theme.mutedText}>-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
