import React, { useState, useMemo } from 'react';
import { List, ChevronDown, ChevronRight, Star, Filter } from 'lucide-react';
import { useTrackerData } from '../hooks/useTrackerData';
import { useConfig } from '../hooks/useConfig';
import { useTheme } from '../contexts/ThemeContext';

interface TaskListItem {
  id: string;
  name: string;
  type: 'task' | 'subtask' | 'subsubtask';
  category?: string;
  assignedTo?: string;
  milestones: string[];
  priority?: number;
  status?: string;
  parentId?: string;
}

export const TaskListDashboard: React.FC = () => {
  const { groupedData, users, loading, error } = useTrackerData();
  const { colors } = useTheme();
  const { categoryColors, loading: configLoading } = useConfig();
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const toggleTask = (taskId: string) => {
    setCollapsedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getCategoryColor = (category: string) => {
    const categoryKey = category as keyof typeof categoryColors;
    return categoryColors[categoryKey] || '#6b7280';
  };

  const taskListData = useMemo(() => {
    const items: TaskListItem[] = [];

    groupedData.forEach(({ task, subtasks }) => {
      items.push({
        id: task.id,
        name: task.name,
        type: 'task',
        category: task.category,
        priority: task.priority,
        milestones: [],
        status: subtasks.some(st => st.milestones.some(m => m.milestone_text.toUpperCase() === 'CLOSED'))
          ? 'CLOSED'
          : subtasks.some(st => st.milestones.length > 0)
          ? 'IN PROGRESS'
          : 'NOT STARTED'
      });

      subtasks.forEach(({ subtask, milestones, subSubtasks, assignedUser }) => {
        if (subtask.name.toUpperCase() === 'PLANNED') return;

        items.push({
          id: subtask.id,
          name: subtask.name,
          type: 'subtask',
          assignedTo: assignedUser?.full_name,
          milestones: milestones.map(m => m.milestone_text),
          status: milestones.some(m => m.milestone_text.toUpperCase() === 'CLOSED')
            ? 'CLOSED'
            : milestones.length > 0
            ? 'IN PROGRESS'
            : 'NOT STARTED',
          parentId: task.id
        });

        subSubtasks.forEach(({ subSubtask, milestones: subMilestones }) => {
          items.push({
            id: subSubtask.id,
            name: subSubtask.name,
            type: 'subsubtask',
            assignedTo: assignedUser?.full_name,
            milestones: subMilestones.map(m => m.milestone_text),
            status: subMilestones.some(m => m.milestone_text.toUpperCase() === 'CLOSED')
              ? 'CLOSED'
              : subMilestones.length > 0
              ? 'IN PROGRESS'
              : 'NOT STARTED',
            parentId: subtask.id
          });
        });
      });
    });

    return items;
  }, [groupedData]);

  const filteredData = useMemo(() => {
    return taskListData.filter(item => {
      if (categoryFilter !== 'all' && item.type === 'task' && item.category !== categoryFilter) {
        return false;
      }
      if (assigneeFilter !== 'all' && item.assignedTo !== assigneeFilter) {
        if (item.type === 'task') {
          const hasMatchingSubtask = taskListData.some(
            subItem => subItem.parentId === item.id && subItem.assignedTo === assigneeFilter
          );
          if (!hasMatchingSubtask) return false;
        } else {
          return false;
        }
      }
      return true;
    });
  }, [taskListData, categoryFilter, assigneeFilter]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'CLOSED':
        return 'bg-green-600/20 text-green-400 border-green-600/50';
      case 'IN PROGRESS':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/50';
      case 'NOT STARTED':
        return 'bg-gray-600/20 text-gray-400 border-gray-600/50';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/50';
    }
  };

  const renderItem = (item: TaskListItem) => {
    const isCollapsed = collapsedTasks.has(item.id);
    const hasChildren = item.type !== 'subsubtask' && filteredData.some(i => i.parentId === item.id);
    const level = item.type === 'task' ? 0 : item.type === 'subtask' ? 1 : 2;

    if (item.type !== 'task' && isCollapsed && filteredData.some(i => i.parentId === item.parentId && collapsedTasks.has(i.parentId!))) {
      return null;
    }

    return (
      <div
        key={item.id}
        className={`${colors.cardBg} border-b ${colors.border} hover:bg-gray-800/50 transition-colors`}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ paddingLeft: `${level * 32 + 16}px` }}>
          {hasChildren && (
            <button onClick={() => toggleTask(item.id)} className="text-gray-400 hover:text-white">
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <div className="flex-1 flex items-center gap-3">
            {item.type === 'task' && (
              <>
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.category ? getCategoryColor(item.category) : '#6b7280' }}
                />
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= (item.priority || 2)
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            <span className={`${item.type === 'task' ? 'font-semibold text-lg' : item.type === 'subtask' ? 'font-medium' : 'text-sm'}`}>
              {item.name}
            </span>
          </div>

          {item.category && item.type === 'task' && (
            <span className="px-3 py-1 rounded text-xs font-semibold uppercase" style={{ backgroundColor: getCategoryColor(item.category), color: 'white' }}>
              {item.category}
            </span>
          )}

          {item.assignedTo && (
            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded text-sm">
              {item.assignedTo}
            </span>
          )}

          <span className={`px-3 py-1 rounded text-xs font-medium border ${getStatusColor(item.status)}`}>
            {item.status}
          </span>

          {item.milestones.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>{item.milestones.length} milestone{item.milestones.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    );
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
    <div className={`min-h-screen ${colors.bg} ${colors.text}`}>
      <header className={`${colors.headerBg} border-b ${colors.border} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <List className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold">Task List</h1>
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`${colors.bgSecondary} border ${colors.border} ${colors.text} px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">All Categories</option>
              <option value="dev">DEV</option>
              <option value="test">TEST</option>
              <option value="infra">INFRA</option>
              <option value="support">SUPPORT</option>
            </select>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className={`${colors.bgSecondary} border ${colors.border} ${colors.text} px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">All Assignees</option>
              {users.map(user => (
                <option key={user.id} value={user.full_name}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className={`${colors.cardBg} border ${colors.border} rounded-lg overflow-hidden`}>
          {filteredData.filter(item => item.type === 'task').length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No tasks to display
            </div>
          ) : (
            filteredData.map(item => renderItem(item))
          )}
        </div>
      </div>
    </div>
  );
};
