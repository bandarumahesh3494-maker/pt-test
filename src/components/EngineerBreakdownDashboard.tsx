import React, { useMemo } from 'react';
import { useTrackerData } from '../hooks/useTrackerData';

interface TaskBreakdown {
  taskId: string;
  taskName: string;
  category: string;
  milestoneCount: number;
  percentage: number;
}

interface UserData {
  userId: string;
  userName: string;
  totalMilestones: number;
  tasks: TaskBreakdown[];
}

export const EngineerBreakdownDashboard: React.FC = () => {
  const { groupedData, users, loading, error } = useTrackerData();

  const userBreakdowns = useMemo(() => {
    const breakdownMap = new Map<string, UserData>();

    groupedData.forEach(({ task, subtasks }) => {
      subtasks.forEach(({ subtask, milestones, subSubtasks, assignedUser }) => {
        if (!assignedUser) return;

        const userId = assignedUser.id;
        const userName = assignedUser.full_name;

        if (!breakdownMap.has(userId)) {
          breakdownMap.set(userId, {
            userId,
            userName,
            totalMilestones: 0,
            tasks: []
          });
        }

        const userData = breakdownMap.get(userId)!;
        const milestoneCount = milestones.length;

        let taskBreakdown = userData.tasks.find(t => t.taskId === task.id);
        if (!taskBreakdown) {
          taskBreakdown = {
            taskId: task.id,
            taskName: task.name,
            category: task.category,
            milestoneCount: 0,
            percentage: 0
          };
          userData.tasks.push(taskBreakdown);
        }

        taskBreakdown.milestoneCount += milestoneCount;
        userData.totalMilestones += milestoneCount;

        subSubtasks.forEach(({ milestones: subMilestones }) => {
          const subMilestoneCount = subMilestones.length;
          taskBreakdown!.milestoneCount += subMilestoneCount;
          userData.totalMilestones += subMilestoneCount;
        });
      });
    });

    breakdownMap.forEach(userData => {
      userData.tasks.forEach(task => {
        task.percentage = userData.totalMilestones > 0
          ? (task.milestoneCount / userData.totalMilestones) * 100
          : 0;
      });
      userData.tasks.sort((a, b) => b.percentage - a.percentage);
    });

    return Array.from(breakdownMap.values()).sort((a, b) =>
      a.userName.localeCompare(b.userName)
    );
  }, [groupedData]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'dev':
        return 'bg-blue-500';
      case 'test':
        return 'bg-green-500';
      case 'infra':
        return 'bg-orange-500';
      case 'support':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'dev':
        return 'Development';
      case 'test':
        return 'Testing';
      case 'infra':
        return 'Infrastructure';
      case 'support':
        return 'Support';
      default:
        return category;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Task Breakdown</h1>

        {userBreakdowns.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No user data available. Assign users to subtasks to see their breakdown.
          </div>
        ) : (
          <div className="space-y-6">
            {userBreakdowns.map(user => (
              <div
                key={user.userId}
                className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{user.userName}</h2>
                    <p className="text-gray-400 text-sm">
                      Total Milestones: {user.totalMilestones}
                    </p>
                  </div>
                </div>

                {user.tasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tasks assigned</p>
                ) : (
                  <div className="space-y-3">
                    {user.tasks.map(task => (
                      <div key={task.taskId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.taskName}</span>
                            <span className={`text-xs px-2 py-1 rounded text-white ${getCategoryColor(task.category)}`}>
                              {getCategoryLabel(task.category)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-400">
                              {task.milestoneCount} milestone{task.milestoneCount !== 1 ? 's' : ''}
                            </span>
                            <span className="text-lg font-bold text-blue-400 min-w-[60px] text-right">
                              {task.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${getCategoryColor(task.category)} transition-all duration-300`}
                            style={{ width: `${task.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
