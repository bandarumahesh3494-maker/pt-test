import React, { useState, useEffect } from 'react';
import { Users, BarChart2, PieChart, TrendingUp } from 'lucide-react';
import { useTrackerData } from '../hooks/useTrackerData';
import { useTheme } from '../contexts/ThemeContext';
import type { User, Task } from '../types';

interface ResourceMetrics {
  user: User;
  totalSubtasks: number;
  totalSubSubtasks: number;
  tasksByCategory: {
    dev: number;
    test: number;
    infra: number;
    support: number;
  };
  tasks: Set<string>;
}

export const ResourceAnalysisDashboard: React.FC = () => {
  const { groupedData, users, loading, error } = useTrackerData();
  const { colors } = useTheme();
  const [resourceMetrics, setResourceMetrics] = useState<ResourceMetrics[]>([]);

  useEffect(() => {
    if (!loading && groupedData && users) {
      calculateResourceMetrics();
    }
  }, [groupedData, users, loading]);

  const calculateResourceMetrics = () => {
    const metricsMap = new Map<string, ResourceMetrics>();

    users.forEach(user => {
      metricsMap.set(user.id, {
        user,
        totalSubtasks: 0,
        totalSubSubtasks: 0,
        tasksByCategory: {
          dev: 0,
          test: 0,
          infra: 0,
          support: 0
        },
        tasks: new Set<string>()
      });
    });

    groupedData.forEach(({ task, subtasks }) => {
      subtasks.forEach(({ subtask, assignedUser, subSubtasks }) => {
        if (assignedUser && metricsMap.has(assignedUser.id)) {
          const metrics = metricsMap.get(assignedUser.id)!;
          metrics.totalSubtasks++;
          metrics.tasks.add(task.id);
          metrics.tasksByCategory[task.category]++;
        }

        subSubtasks.forEach(({ assignedUser: subAssignedUser }) => {
          if (subAssignedUser && metricsMap.has(subAssignedUser.id)) {
            const metrics = metricsMap.get(subAssignedUser.id)!;
            metrics.totalSubSubtasks++;
            metrics.tasks.add(task.id);
          }
        });
      });
    });

    const sortedMetrics = Array.from(metricsMap.values()).sort((a, b) => {
      const totalA = a.totalSubtasks + a.totalSubSubtasks;
      const totalB = b.totalSubtasks + b.totalSubSubtasks;
      return totalB - totalA;
    });

    setResourceMetrics(sortedMetrics);
  };

  const getTotalWorkItems = () => {
    return resourceMetrics.reduce((sum, m) => sum + m.totalSubtasks + m.totalSubSubtasks, 0);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'dev':
        return 'bg-blue-500';
      case 'test':
        return 'bg-green-500';
      case 'infra':
        return 'bg-orange-500';
      case 'support':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getWorkloadPercentage = (userTotal: number, overallTotal: number) => {
    if (overallTotal === 0) return 0;
    return Math.round((userTotal / overallTotal) * 100);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center`}>
        <div className="text-xl">Loading resource analysis...</div>
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

  const totalWorkItems = getTotalWorkItems();

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text}`}>
      <header className={`${colors.headerBg} border-b ${colors.border} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-green-500" />
            <div>
              <h1 className="text-2xl font-bold">Resource Analysis</h1>
              <p className="text-sm text-gray-400">Workload distribution across team members</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className={`${colors.cardBg} px-4 py-2 rounded-lg border ${colors.border}`}>
              <div className="text-sm text-gray-400">Total Work Items</div>
              <div className="text-2xl font-bold">{totalWorkItems}</div>
            </div>
            <div className={`${colors.cardBg} px-4 py-2 rounded-lg border ${colors.border}`}>
              <div className="text-sm text-gray-400">Team Members</div>
              <div className="text-2xl font-bold">{users.length}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className={`${colors.cardBg} rounded-lg border ${colors.border} p-6`}>
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold">Workload Distribution</h2>
          </div>

          <div className="space-y-4">
            {resourceMetrics.map((metrics) => {
              const totalItems = metrics.totalSubtasks + metrics.totalSubSubtasks;
              const percentage = getWorkloadPercentage(totalItems, totalWorkItems);

              return (
                <div key={metrics.user.id} className={`${colors.bgSecondary} rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-lg">{metrics.user.full_name}</div>
                        <div className="text-sm text-gray-400">{metrics.user.email}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        metrics.user.role === 'admin'
                          ? 'bg-purple-900/50 text-purple-300'
                          : 'bg-blue-900/50 text-blue-300'
                      }`}>
                        {metrics.user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{totalItems}</div>
                      <div className="text-sm text-gray-400">work items ({percentage}%)</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`${colors.cardBg} rounded p-3 border ${colors.border}`}>
                      <div className="text-sm text-gray-400">Subtasks</div>
                      <div className="text-xl font-bold">{metrics.totalSubtasks}</div>
                    </div>
                    <div className={`${colors.cardBg} rounded p-3 border ${colors.border}`}>
                      <div className="text-sm text-gray-400">Sub-subtasks</div>
                      <div className="text-xl font-bold">{metrics.totalSubSubtasks}</div>
                    </div>
                    <div className={`${colors.cardBg} rounded p-3 border ${colors.border}`}>
                      <div className="text-sm text-gray-400">Unique Tasks</div>
                      <div className="text-xl font-bold">{metrics.tasks.size}</div>
                    </div>
                    <div className={`${colors.cardBg} rounded p-3 border ${colors.border}`}>
                      <div className="text-sm text-gray-400">Avg per Task</div>
                      <div className="text-xl font-bold">
                        {metrics.tasks.size > 0 ? (totalItems / metrics.tasks.size).toFixed(1) : '0'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-400 mb-2">Tasks by Category</div>
                    <div className="grid grid-cols-4 gap-2">
                      {(['dev', 'test', 'infra', 'support'] as const).map((category) => (
                        <div key={category} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${getCategoryColor(category)}`}></div>
                          <span className="text-sm capitalize">{category}</span>
                          <span className="text-sm font-bold ml-auto">{metrics.tasksByCategory[category]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {resourceMetrics.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No resource data available</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${colors.cardBg} rounded-lg border ${colors.border} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold">Category Distribution</h2>
            </div>
            <div className="space-y-3">
              {(['dev', 'test', 'infra', 'support'] as const).map((category) => {
                const total = resourceMetrics.reduce((sum, m) => sum + m.tasksByCategory[category], 0);
                const percentage = totalWorkItems > 0 ? Math.round((total / totalWorkItems) * 100) : 0;
                return (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium">{category}</span>
                      <span className="text-gray-400">{total} items ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`${getCategoryColor(category)} h-2 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${colors.cardBg} rounded-lg border ${colors.border} p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold">Key Insights</h2>
            </div>
            <div className="space-y-3">
              {resourceMetrics.length > 0 && (
                <>
                  <div className={`${colors.bgSecondary} p-3 rounded`}>
                    <div className="text-sm text-gray-400">Most Loaded</div>
                    <div className="font-medium">
                      {resourceMetrics[0].user.full_name} ({resourceMetrics[0].totalSubtasks + resourceMetrics[0].totalSubSubtasks} items)
                    </div>
                  </div>
                  <div className={`${colors.bgSecondary} p-3 rounded`}>
                    <div className="text-sm text-gray-400">Least Loaded</div>
                    <div className="font-medium">
                      {resourceMetrics[resourceMetrics.length - 1].user.full_name} ({resourceMetrics[resourceMetrics.length - 1].totalSubtasks + resourceMetrics[resourceMetrics.length - 1].totalSubSubtasks} items)
                    </div>
                  </div>
                  <div className={`${colors.bgSecondary} p-3 rounded`}>
                    <div className="text-sm text-gray-400">Average per Person</div>
                    <div className="font-medium">
                      {(totalWorkItems / users.length).toFixed(1)} items
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
