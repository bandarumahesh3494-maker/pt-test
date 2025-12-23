import React, { useMemo } from 'react';
import { useTrackerData } from '../hooks/useTrackerData';
import { User } from '../types';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface MilestoneComparison {
  milestoneName: string;
  plannedDate: string | null;
  actualDate: string | null;
  daysDelay: number | null;
}

interface UserTask {
  taskName: string;
  subtaskName: string;
  milestones: MilestoneComparison[];
  averageDelay: number;
  worstDelay: number;
  status: 'on-time' | 'delayed' | 'pending';
}

interface UserPerformance {
  user: User;
  tasks: UserTask[];
  averageDelay: number;
  totalDelayed: number;
}

export const EngineerPerformanceDashboard: React.FC = () => {
  const { groupedData, users, loading } = useTrackerData();
  const { theme } = useTheme();

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

  const userPerformance = useMemo<UserPerformance[]>(() => {
    return users.map(user => {
      const tasks: UserTask[] = [];

      groupedData.forEach(group => {
        const plannedSubtask = group.subtasks.find(st => st.subtask.name.toUpperCase() === 'PLANNED');

        const plannedMilestones: { [milestoneText: string]: string } = {};
        if (plannedSubtask) {
          plannedSubtask.milestones.forEach(m => {
            plannedMilestones[m.milestone_text] = m.milestone_date;
          });
        }

        const assignedSubtasks = group.subtasks.filter(
          st => st.assignedUser?.id === user.id &&
               st.subtask.name.toUpperCase() !== 'PLANNED' &&
               st.subtask.name.toUpperCase() !== 'ACTUAL'
        );

        assignedSubtasks.forEach(st => {
          const milestoneNames = new Set<string>();

          st.milestones.forEach(m => milestoneNames.add(m.milestone_text));
          st.subSubtasks?.forEach(sst => {
            sst.milestones.forEach(m => milestoneNames.add(m.milestone_text));
          });

          const milestones: MilestoneComparison[] = Array.from(milestoneNames).map(milestoneName => {
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

          let status: 'on-time' | 'delayed' | 'pending' = 'pending';
          if (milestones.length > 0) {
            status = worstDelay > 0 ? 'delayed' : 'on-time';
          }

          tasks.push({
            taskName: group.task.name,
            subtaskName: st.subtask.name,
            milestones,
            averageDelay,
            worstDelay,
            status
          });
        });
      });

      const delayedTasks = tasks.filter(t => t.worstDelay > 0);
      const allDelays = tasks.filter(t => t.worstDelay > 0).map(t => t.worstDelay);
      const averageDelay = allDelays.length > 0
        ? allDelays.reduce((sum, delay) => sum + delay, 0) / allDelays.length
        : 0;

      return {
        user,
        tasks,
        averageDelay,
        totalDelayed: delayedTasks.length
      };
    }).filter(ep => ep.tasks.length > 0);
  }, [groupedData, users]);

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
        <h1 className="text-3xl font-bold mb-8">User Performance Dashboard</h1>

        {userPerformance.length === 0 ? (
          <div className={`${theme.cardBg} rounded-lg p-8 text-center ${theme.border} border`}>
            <p className={theme.mutedText}>No user data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {userPerformance.map(ep => (
              <div key={ep.user.id} className={`${theme.cardBg} rounded-lg p-6 border-4 border-white`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold">{ep.user.full_name}</h2>
                    <p className={`text-sm ${theme.mutedText}`}>{ep.user.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      {ep.totalDelayed > 0 ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      )}
                      <span className="text-lg font-semibold">
                        {ep.totalDelayed} Delayed Tasks
                      </span>
                    </div>
                    {ep.averageDelay > 0 && (
                      <p className={`text-sm ${theme.mutedText}`}>
                        Avg Delay: {ep.averageDelay.toFixed(1)} days
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {ep.tasks.map((task, idx) => {
                    const getDelayColor = () => {
                      if (task.status === 'on-time') return 'border-green-500';
                      if (task.status === 'pending') return 'border-gray-500';
                      if (task.worstDelay >= 4) return 'border-red-500';
                      if (task.worstDelay >= 1) return 'border-orange-500';
                      return 'border-green-500';
                    };

                    return (
                    <div key={idx} className={`border-4 rounded-lg p-4 ${getDelayColor()}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{task.taskName} - {task.subtaskName}</h3>
                          {task.averageDelay > 0 && (
                            <p className={`text-sm ${theme.mutedText}`}>
                              Average Delay: {task.averageDelay.toFixed(1)} days
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status === 'delayed' && (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-400" />
                              <span className="px-2 py-1 rounded text-xs font-medium bg-red-900/30 text-red-300">
                                {task.worstDelay} days behind
                              </span>
                            </>
                          )}
                          {task.status === 'on-time' && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-900/30 text-green-300">
                              On Time
                            </span>
                          )}
                          {task.status === 'pending' && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${theme.border} border ${theme.mutedText}`}>
                              Pending
                            </span>
                          )}
                        </div>
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
                            {task.milestones.map((milestone, milIdx) => (
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
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
