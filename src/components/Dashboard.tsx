import React, { useState, useMemo } from 'react';
import { Plus, Calendar, UserPlus, Edit2, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/actionLogger';
import { useTrackerData } from '../hooks/useTrackerData';
import { useConfig } from '../hooks/useConfig';
import { AddTaskModal } from './AddTaskModal';
import { AddSubtaskModal } from './AddSubtaskModal';
import { AddSubSubtaskModal } from './AddSubSubtaskModal';
import { MilestoneModal } from './MilestoneModal';
import { AddPersonModal } from './AddPersonModal';
import { TimeRangeSelector } from './TimeRangeSelector';
import { EditTaskModal } from './EditTaskModal';
import { EditSubtaskModal } from './EditSubtaskModal';
import { EditSubSubtaskModal } from './EditSubSubtaskModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { groupedData, users, loading, error, refetch } = useTrackerData();
  const { colors } = useTheme();
  const { milestoneOptions, rowColors, loading: configLoading } = useConfig();
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState<{ taskId: string; taskName: string } | null>(null);
  const [showAddSubSubtask, setShowAddSubSubtask] = useState<{ subtaskId: string; subtaskName: string } | null>(null);
  const [showMilestone, setShowMilestone] = useState<{
    subtaskId?: string;
    subSubtaskId?: string;
    subtaskName: string;
    date: string;
  } | null>(null);
  const [showEditTask, setShowEditTask] = useState<{ taskId: string; taskName: string; taskPriority: number } | null>(null);
  const [showEditSubtask, setShowEditSubtask] = useState<{ subtaskId: string; subtaskName: string } | null>(null);
  const [showEditSubSubtask, setShowEditSubSubtask] = useState<{ subSubtaskId: string; subSubtaskName: string; parentSubtaskName: string } | null>(null);
  const [showDeleteTask, setShowDeleteTask] = useState<{ taskId: string; taskName: string } | null>(null);
  const [showDeleteSubtask, setShowDeleteSubtask] = useState<{ subtaskId: string; subtaskName: string } | null>(null);
  const [showDeleteSubSubtask, setShowDeleteSubSubtask] = useState<{ subSubtaskId: string; subSubtaskName: string } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hiddenTaskSubtasks, setHiddenTaskSubtasks] = useState<Set<string>>(new Set());
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [hideClosedTasks, setHideClosedTasks] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'category' | 'priority'>('category');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  const dateRange = useMemo(() => {
    const dates: string[] = [];
    let startDate: Date;
    let endDate: Date;

    if (dateRangeStart && dateRangeEnd) {
      startDate = new Date(dateRangeStart);
      endDate = new Date(dateRangeEnd);
    } else {
      const today = new Date();
      startDate = new Date(today);

      // Adjust default range based on view mode
      if (viewMode === 'day') {
        // Show today only
        startDate.setDate(today.getDate());
        endDate = new Date(today);
      } else if (viewMode === 'week') {
        // Show 1 week before and 4 weeks ahead
        startDate.setDate(today.getDate() - 7);
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 28);
      } else {
        // Month view: Show 1 week before and 2 months ahead
        startDate.setDate(today.getDate() - 7);
        endDate = new Date(today);
        endDate.setMonth(today.getMonth() + 2);
      }
    }

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [dateRangeStart, dateRangeEnd, viewMode]);

  const handleRangeChange = (start: string, end: string) => {
    setDateRangeStart(start);
    setDateRangeEnd(end);
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return `${day}-${month}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'dev': return 'bg-green-700/30 border-green-600';
      case 'test': return 'bg-blue-700/30 border-blue-600';
      case 'infra': return 'bg-yellow-700/30 border-yellow-600';
      case 'support': return 'bg-orange-700/30 border-orange-600';
      default: return 'bg-gray-700/30 border-gray-600';
    }
  };

  const getMilestoneColor = (milestoneText: string) => {
    if (milestoneText === 'PLANNED') {
      return 'bg-blue-500 border-blue-400 text-white font-semibold';
    }
    return 'bg-blue-900/50 border border-blue-600';
  };

  const getActualRowColor = (milestoneText: string | undefined): string => {
    if (!milestoneText) {
      return hexToRgba(rowColors.actual, rowColors.actualOpacity);
    }

    const milestone = milestoneText.toUpperCase();

    // Green: Completed/Production states
    if (milestone === 'CLOSED' || milestone === 'PROD MERGE DONE') {
      return 'rgba(34, 197, 94, 0.2)'; // green
    }

    // Yellow: Work in progress states
    if (milestone === 'IN PROGRESS' ||
        milestone === 'DEV COMPLETE' ||
        milestone === 'DEV MERGE DONE' ||
        milestone === 'STAGING MERGE DONE') {
      return 'rgba(234, 179, 8, 0.2)'; // yellow
    }

    // Red: Not started or behind schedule
    if (milestone === 'PLANNED') {
      return 'rgba(239, 68, 68, 0.2)'; // red
    }

    // Default color for any other status
    return hexToRgba(rowColors.actual, rowColors.actualOpacity);
  };

  const handleCategoryChange = async (taskId: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ category: newCategory, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const isTaskClosed = (subtasks: any[]) => {
    return subtasks.some(st =>
      st.milestones.some((m: any) => m.milestone_text.toUpperCase() === 'CLOSED')
    );
  };

  const handleAssignmentChange = async (subtaskId: string, userId: string | null) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ assigned_to: userId, updated_at: new Date().toISOString() })
        .eq('id', subtaskId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating assignment:', err);
    }
  };

  const handleSubSubtaskAssignmentChange = async (subSubtaskId: string, userId: string | null) => {
    try {
      const { error } = await supabase
        .from('sub_subtasks')
        .update({ assigned_to: userId })
        .eq('id', subSubtaskId);

      if (error) throw error;
      refetch();
    } catch (err) {
      console.error('Error updating sub-subtask assignment:', err);
    }
  };

  const handleAddMilestone = async (subtaskId: string | null, subSubtaskId: string | null, date: string, milestoneText: string) => {
    try {
      // Add the milestone to the sub-subtask or subtask
      const { data: milestoneData, error } = await supabase
        .from('milestones')
        .insert({
          subtask_id: subtaskId,
          sub_subtask_id: subSubtaskId,
          milestone_date: date,
          milestone_text: milestoneText,
          created_by: null
        })
        .select()
        .single();

      if (error) throw error;

      // Check if this is a PLANNED item and log if so
      if (milestoneData) {
        let isPlanned = false;
        let entityName = '';

        if (subSubtaskId) {
          // Get sub-subtask and its parent subtask
          const { data: subSubtask } = await supabase
            .from('sub_subtasks')
            .select('name, subtask_id, subtasks(name)')
            .eq('id', subSubtaskId)
            .single();

          if (subSubtask && subSubtask.subtasks && 'name' in subSubtask.subtasks) {
            isPlanned = subSubtask.subtasks.name.toUpperCase() === 'PLANNED';
            entityName = subSubtask.name;
          }
        } else if (subtaskId) {
          // Get subtask
          const { data: subtask } = await supabase
            .from('subtasks')
            .select('name')
            .eq('id', subtaskId)
            .single();

          if (subtask) {
            isPlanned = subtask.name.toUpperCase() === 'PLANNED';
            entityName = subtask.name;
          }
        }

        if (isPlanned) {
          await logAction({
            actionType: 'create',
            entityType: 'milestone',
            entityId: milestoneData.id,
            entityName: milestoneText,
            details: {
              subtask_name: entityName,
              date,
              type: subSubtaskId ? 'sub_subtask' : 'subtask'
            },
          });
        }
      }

      // If this is a sub-subtask milestone, update parent subtask milestone to longest pole
      if (subSubtaskId) {
        // Get the parent subtask ID
        const { data: subSubtask } = await supabase
          .from('sub_subtasks')
          .select('subtask_id')
          .eq('id', subSubtaskId)
          .single();

        if (subSubtask) {
          const parentSubtaskId = subSubtask.subtask_id;

          // Get all sub-subtasks for this parent
          const { data: allSubSubtasks } = await supabase
            .from('sub_subtasks')
            .select('id')
            .eq('subtask_id', parentSubtaskId);

          if (allSubSubtasks && allSubSubtasks.length > 0) {
            const subSubtaskIds = allSubSubtasks.map(s => s.id);

            // Get all milestones for these sub-subtasks with the same milestone_text
            const { data: allMilestones } = await supabase
              .from('milestones')
              .select('milestone_date, milestone_text')
              .in('sub_subtask_id', subSubtaskIds)
              .eq('milestone_text', milestoneText);

            if (allMilestones && allMilestones.length > 0) {
              // Find the latest date for this milestone type
              const latestDate = allMilestones.reduce((latest, m) => {
                return m.milestone_date > latest ? m.milestone_date : latest;
              }, allMilestones[0].milestone_date);

              // Check if parent subtask already has this milestone
              const { data: existingParentMilestone } = await supabase
                .from('milestones')
                .select('id, milestone_date')
                .eq('subtask_id', parentSubtaskId)
                .is('sub_subtask_id', null)
                .eq('milestone_text', milestoneText)
                .maybeSingle();

              if (existingParentMilestone) {
                // Update existing milestone if the new date is later
                if (latestDate !== existingParentMilestone.milestone_date) {
                  await supabase
                    .from('milestones')
                    .update({ milestone_date: latestDate })
                    .eq('id', existingParentMilestone.id);
                }
              } else {
                // Create new milestone for parent subtask
                await supabase
                  .from('milestones')
                  .insert({
                    subtask_id: parentSubtaskId,
                    sub_subtask_id: null,
                    milestone_date: latestDate,
                    milestone_text: milestoneText,
                    created_by: null
                  });
              }
            }
          }
        }
      }

      refetch();
    } catch (err) {
      console.error('Error adding milestone:', err);
    }
  };

  const toggleTaskSubtasks = (taskId: string) => {
    setHiddenTaskSubtasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = groupedData.find(({ task }) => task.id === taskId);
    const taskName = taskToDelete?.task.name || 'Unknown Task';

    const { data: subtasks } = await supabase
      .from('subtasks')
      .select('id')
      .eq('task_id', taskId);

    if (subtasks) {
      for (const subtask of subtasks) {
        await supabase.from('milestones').delete().eq('subtask_id', subtask.id);

        const { data: subSubtasks } = await supabase
          .from('sub_subtasks')
          .select('id')
          .eq('subtask_id', subtask.id);

        if (subSubtasks) {
          for (const subSubtask of subSubtasks) {
            await supabase.from('milestones').delete().eq('sub_subtask_id', subSubtask.id);
          }
          await supabase.from('sub_subtasks').delete().eq('subtask_id', subtask.id);
        }
      }
      await supabase.from('subtasks').delete().eq('task_id', taskId);
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    await logAction({
      actionType: 'delete',
      entityType: 'task',
      entityId: taskId,
      entityName: taskName,
      details: {
        category: taskToDelete?.task.category
      },
    });

    refetch();
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const { data: subtaskData } = await supabase
      .from('subtasks')
      .select('name')
      .eq('id', subtaskId)
      .single();

    await supabase.from('milestones').delete().eq('subtask_id', subtaskId);

    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtaskId);

    if (error) throw error;

    if (subtaskData && subtaskData.name.toUpperCase() === 'PLANNED') {
      await logAction({
        actionType: 'delete',
        entityType: 'subtask',
        entityId: subtaskId,
        entityName: subtaskData.name,
      });
    }

    refetch();
  };

  const handleDeleteSubSubtask = async (subSubtaskId: string) => {
    const { data: subSubtaskData } = await supabase
      .from('sub_subtasks')
      .select('name, subtask_id, subtasks(name)')
      .eq('id', subSubtaskId)
      .single();

    await supabase.from('milestones').delete().eq('sub_subtask_id', subSubtaskId);

    const { error } = await supabase
      .from('sub_subtasks')
      .delete()
      .eq('id', subSubtaskId);

    if (error) throw error;

    if (subSubtaskData && subSubtaskData.subtasks && 'name' in subSubtaskData.subtasks && subSubtaskData.subtasks.name.toUpperCase() === 'PLANNED') {
      await logAction({
        actionType: 'delete',
        entityType: 'sub_subtask',
        entityId: subSubtaskId,
        entityName: subSubtaskData.name,
      });
    }

    refetch();
  };

  const calculateActualMilestones = (subtasks: any[]) => {
    const milestoneLastDates: { [milestoneText: string]: string } = {};

    subtasks.forEach(st => {
      if (st.subtask.name.toUpperCase() !== 'PLANNED' && st.subtask.name.toUpperCase() !== 'ACTUAL') {
        st.milestones.forEach((m: any) => {
          if (!milestoneLastDates[m.milestone_text] || m.milestone_date > milestoneLastDates[m.milestone_text]) {
            milestoneLastDates[m.milestone_text] = m.milestone_date;
          }
        });

        st.subSubtasks?.forEach((sst: any) => {
          sst.milestones.forEach((m: any) => {
            if (!milestoneLastDates[m.milestone_text] || m.milestone_date > milestoneLastDates[m.milestone_text]) {
              milestoneLastDates[m.milestone_text] = m.milestone_date;
            }
          });
        });
      }
    });

    const actualMilestones: { [date: string]: string } = {};
    Object.entries(milestoneLastDates).forEach(([milestoneText, date]) => {
      actualMilestones[date] = milestoneText;
    });

    return actualMilestones;
  };

  if (loading || configLoading) {
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
    <div className={`min-h-screen ${colors.bg} ${colors.text}`}>
      <header className={`${colors.headerBg} border-b ${colors.border} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold">Project Tracker</h1>
          </div>
          <div className="flex gap-3">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'day' | 'week' | 'month')}
              className={`${colors.bgSecondary} border ${colors.border} ${colors.text} px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="day">Day View</option>
              <option value="week">Week View</option>
              <option value="month">Month View</option>
            </select>
            <TimeRangeSelector onRangeChange={handleRangeChange} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'category' | 'priority')}
              className={`${colors.bgSecondary} border ${colors.border} ${colors.text} px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="category">Sort by Category</option>
              <option value="priority">Sort by Priority</option>
            </select>
            <select
              value={selectedEngineer}
              onChange={(e) => setSelectedEngineer(e.target.value)}
              className={`${colors.bgSecondary} border ${colors.border} ${colors.text} px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">All Engineers</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.email}
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
            {isAdmin && (
              <>
                {/* <button
                  onClick={() => setShowAddPerson(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                  Add Person
                </button> */}
                <button
                  onClick={() => setShowAddTask(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Task
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className={colors.headerBg}>
                  <th className={`sticky left-0 z-20 ${colors.headerBg} border ${colors.border} px-4 py-3 text-left font-semibold min-w-[120px]`}>
                    Category
                  </th>
                  <th className={`sticky left-[120px] z-20 ${colors.headerBg} border ${colors.border} px-4 py-3 text-left font-semibold min-w-[180px]`}>
                    Task Name
                  </th>
                  <th className={`sticky left-[300px] z-20 ${colors.headerBg} border ${colors.border} px-4 py-3 text-left font-semibold min-w-[150px]`}>
                    Sub Task
                  </th>
                  <th className={`sticky left-[450px] z-20 ${colors.headerBg} border ${colors.border} px-4 py-3 text-left font-semibold min-w-[150px]`}>
                    Engineer/Lead
                  </th>
                  {dateRange.map(date => (
                    <th
                      key={date}
                      className={`border ${colors.border} px-3 py-3 text-center font-semibold min-w-[120px] ${colors.headerBg}`}
                    >
                      {formatDateHeader(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedData
                  .filter(({ task, subtasks }) => {
                    if (hideClosedTasks && isTaskClosed(subtasks)) {
                      return false;
                    }
                    if (selectedEngineer !== 'all') {
                      const hasMatchingEngineer = subtasks.some(st =>
                        st.assignedUser?.id === selectedEngineer
                      );
                      if (!hasMatchingEngineer) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    if (sortBy === 'priority') {
                      return (b.task.priority || 2) - (a.task.priority || 2);
                    } else {
                      return a.task.category.localeCompare(b.task.category);
                    }
                  })
                  .map(({ task, subtasks }) => {
                  const plannedSubtask = subtasks.find(st => st.subtask.name.toUpperCase() === 'PLANNED');
                  const otherSubtasks = subtasks.filter(st => st.subtask.name.toUpperCase() !== 'PLANNED');
                  const isHidden = hiddenTaskSubtasks.has(task.id);
                  const actualMilestones = calculateActualMilestones(subtasks);

                  const visibleSubtasks = isHidden ? [] : otherSubtasks;
                  const totalRows = 1 + (plannedSubtask ? 1 + plannedSubtask.subSubtasks.length : 0) +
                    visibleSubtasks.reduce((acc, s) => acc + 1 + s.subSubtasks.length, 0);

                  return (
                    <React.Fragment key={task.id}>
                      {subtasks.length === 0 ? (
                        <tr>
                          <td className={`sticky left-0 z-10 border border-gray-700 px-2 py-3 ${getCategoryColor(task.category)}`}>
                            <select
                              value={task.category}
                              onChange={(e) => handleCategoryChange(task.id, e.target.value)}
                              className="w-full bg-transparent border-none text-white font-medium uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                            >
                              <option value="dev" className="bg-gray-800">DEV</option>
                              <option value="test" className="bg-gray-800">TEST</option>
                              <option value="infra" className="bg-gray-800">INFRA</option>
                              <option value="support" className="bg-gray-800">SUPPORT</option>
                            </select>
                          </td>
                          <td className="sticky left-[120px] z-10 bg-gray-900 border border-gray-700 px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 transition-colors ${
                                      star <= (task.priority || 2)
                                        ? 'fill-yellow-500 text-yellow-500'
                                        : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              {task.name}
                              <button
                                onClick={() => setShowEditTask({ taskId: task.id, taskName: task.name, taskPriority: task.priority || 2 })}
                                className="text-gray-400 hover:text-blue-400 transition-colors"
                                title="Edit task name"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setShowDeleteTask({ taskId: task.id, taskName: task.name })}
                                className="text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => setShowAddSubtask({ taskId: task.id, taskName: task.name })}
                                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-2"
                              >
                                <Plus className="w-3 h-3" />
                                Add Subtask
                              </button>
                            )}
                          </td>
                          <td className="sticky left-[300px] z-10 bg-gray-900 border border-gray-700 px-4 py-3">-</td>
                          <td className="sticky left-[450px] z-10 bg-gray-900 border border-gray-700 px-4 py-3">-</td>
                          {dateRange.map(date => (
                            <td key={date} className="border border-gray-700 px-3 py-2 bg-gray-900"></td>
                          ))}
                        </tr>
                      ) : (
                        <>
                          {/* PLANNED Row */}
                          {plannedSubtask && (
                            <>
                              <tr style={{ backgroundColor: hexToRgba(rowColors.planned, rowColors.plannedOpacity) }}>
                                <td rowSpan={totalRows} className={`sticky left-0 z-10 border border-gray-700 px-2 py-3 ${getCategoryColor(task.category)}`}>
                                  <select
                                    value={task.category}
                                    onChange={(e) => handleCategoryChange(task.id, e.target.value)}
                                    className="w-full bg-transparent border-none text-white font-medium uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                  >
                                    <option value="dev" className="bg-gray-800">DEV</option>
                                    <option value="test" className="bg-gray-800">TEST</option>
                                    <option value="infra" className="bg-gray-800">INFRA</option>
                                    <option value="support" className="bg-gray-800">SUPPORT</option>
                                  </select>
                                </td>
                                <td rowSpan={totalRows} className="sticky left-[120px] z-10 bg-gray-900 border border-gray-700 px-4 py-3">
                                  <div className="font-medium flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-4 h-4 transition-colors ${
                                            star <= (task.priority || 2)
                                              ? 'fill-yellow-500 text-yellow-500'
                                              : 'text-gray-600'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    {task.name}
                                    <button
                                      onClick={() => setShowEditTask({ taskId: task.id, taskName: task.name, taskPriority: task.priority || 2 })}
                                      className="text-gray-400 hover:text-blue-400 transition-colors"
                                      title="Edit task name"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteTask({ taskId: task.id, taskName: task.name })}
                                      className="text-gray-400 hover:text-red-400 transition-colors"
                                      title="Delete task"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      onClick={() => setShowAddSubtask({ taskId: task.id, taskName: task.name })}
                                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-2"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Subtask
                                    </button>
                                  )}
                                  {otherSubtasks.length > 0 && (
                                    <button
                                      onClick={() => toggleTaskSubtasks(task.id)}
                                      className="text-gray-400 hover:text-gray-300 text-xs flex items-center gap-1 mt-2"
                                    >
                                      {isHidden ? 'Show Subtasks' : 'Hide Subtasks'}
                                    </button>
                                  )}
                                </td>
                                <td className="sticky left-[300px] z-10 border border-gray-700 px-4 py-3" style={{ backgroundColor: hexToRgba(rowColors.planned, rowColors.plannedOpacity) }}>
                                  <div>{plannedSubtask.subtask.name}</div>
                                  {isAdmin && (
                                    <button
                                      onClick={() => setShowAddSubSubtask({ subtaskId: plannedSubtask.subtask.id, subtaskName: plannedSubtask.subtask.name })}
                                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Sub-Subtask
                                    </button>
                                  )}
                                </td>
                                <td className="sticky left-[450px] z-10 border border-gray-700 px-2 py-3" style={{ backgroundColor: hexToRgba(rowColors.planned, rowColors.plannedOpacity) }}>
                                  <select
                                    value={plannedSubtask.subtask.assigned_to || ''}
                                    onChange={(e) => handleAssignmentChange(plannedSubtask.subtask.id, e.target.value || null)}
                                    disabled={!isAdmin}
                                    className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="">Unassigned</option>
                                    {users.map(u => (
                                      <option key={u.id} value={u.id}>
                                        {u.full_name} ({u.role})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                {dateRange.map(date => {
                                  const milestonesForDate = plannedSubtask.milestones.filter(m => m.milestone_date === date);
                                  return (
                                    <td key={date} className="border border-gray-700 px-2 py-2 align-top" style={{ backgroundColor: hexToRgba(rowColors.planned, rowColors.plannedOpacity) }}>
                                      <div className="space-y-1">
                                        {milestonesForDate.map(milestone => (
                                          <div
                                            key={milestone.id}
                                            onClick={() => setShowMilestone({
                                              subtaskId: plannedSubtask.subtask.id,
                                              subtaskName: plannedSubtask.subtask.name,
                                              date
                                            })}
                                            className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 ${getMilestoneColor(milestone.milestone_text)}`}
                                          >
                                            {milestone.milestone_text}
                                          </div>
                                        ))}
                                        {openDropdown === `subtask-${plannedSubtask.subtask.id}-${date}` ? (
                                          <select
                                            autoFocus
                                            defaultValue=""
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                handleAddMilestone(plannedSubtask.subtask.id, null, date, e.target.value);
                                                setOpenDropdown(null);
                                              }
                                            }}
                                            onBlur={() => setOpenDropdown(null)}
                                            className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          >
                                            <option value="">Select...</option>
                                            {milestoneOptions.map(option => (
                                              <option key={option.value} value={option.label}>{option.label}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <button
                                            onClick={() => setOpenDropdown(`subtask-${plannedSubtask.subtask.id}-${date}`)}
                                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-xs rounded flex items-center justify-center"
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                              {/* PLANNED Sub-Subtasks */}
                              {plannedSubtask.subSubtasks.map(sst => (
                                <tr key={sst.subSubtask.id} style={{ backgroundColor: hexToRgba(rowColors.planned, rowColors.subSubtaskOpacity) }}>
                                  <td className="sticky left-[300px] z-10 border border-gray-700 px-4 py-3 pl-8" style={{ backgroundColor: hexToRgba(rowColors.planned, rowColors.subSubtaskOpacity) }}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400">↳</span> {sst.subSubtask.name}
                                      <button
                                        onClick={() => setShowEditSubSubtask({ subSubtaskId: sst.subSubtask.id, subSubtaskName: sst.subSubtask.name, parentSubtaskName: plannedSubtask.subtask.name })}
                                        className="text-gray-400 hover:text-blue-400 transition-colors"
                                        title="Edit sub-subtask name"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setShowDeleteSubSubtask({ subSubtaskId: sst.subSubtask.id, subSubtaskName: sst.subSubtask.name })}
                                        className="text-gray-400 hover:text-red-400 transition-colors"
                                        title="Delete sub-subtask"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="sticky left-[450px] z-10 border border-gray-700 px-2 py-3" style={{ backgroundColor: hexToRgba(rowColors.planned, rowColors.subSubtaskOpacity) }}>
                                    <select
                                      value={sst.subSubtask.assigned_to || ''}
                                      onChange={(e) => handleSubSubtaskAssignmentChange(sst.subSubtask.id, e.target.value || null)}
                                      disabled={!isAdmin}
                                      className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <option value="">Unassigned</option>
                                      {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.full_name} ({u.role})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  {dateRange.map(date => {
                                    const milestonesForDate = sst.milestones.filter(m => m.milestone_date === date);
                                    return (
                                      <td key={date} className="border border-gray-700 px-2 py-2 align-top" style={{ backgroundColor: hexToRgba(rowColors.planned, rowColors.subSubtaskOpacity) }}>
                                        <div className="space-y-1">
                                          {milestonesForDate.map(milestone => (
                                            <div
                                              key={milestone.id}
                                              onClick={() => setShowMilestone({
                                                subSubtaskId: sst.subSubtask.id,
                                                subtaskName: `${plannedSubtask.subtask.name} → ${sst.subSubtask.name}`,
                                                date
                                              })}
                                              className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 ${getMilestoneColor(milestone.milestone_text)}`}
                                            >
                                              {milestone.milestone_text}
                                            </div>
                                          ))}
                                          {openDropdown === `subsubtask-${sst.subSubtask.id}-${date}` ? (
                                            <select
                                              autoFocus
                                              defaultValue=""
                                              onChange={(e) => {
                                                if (e.target.value) {
                                                  handleAddMilestone(null, sst.subSubtask.id, date, e.target.value);
                                                  setOpenDropdown(null);
                                                }
                                              }}
                                              onBlur={() => setOpenDropdown(null)}
                                              className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="">Select...</option>
                                              {milestoneOptions.map(option => (
                                                <option key={option.value} value={option.label}>{option.label}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <button
                                              onClick={() => setOpenDropdown(`subsubtask-${sst.subSubtask.id}-${date}`)}
                                              className="w-6 h-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-xs rounded flex items-center justify-center"
                                            >
                                              +
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </>
                          )}

                          {/* ACTUAL Row */}
                          <tr style={{ backgroundColor: hexToRgba(rowColors.actual, rowColors.actualOpacity) }}>
                            {!plannedSubtask && (
                              <>
                                <td rowSpan={totalRows} className={`sticky left-0 z-10 border border-gray-700 px-2 py-3 ${getCategoryColor(task.category)}`}>
                                  <select
                                    value={task.category}
                                    onChange={(e) => handleCategoryChange(task.id, e.target.value)}
                                    className="w-full bg-transparent border-none text-white font-medium uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                  >
                                    <option value="dev" className="bg-gray-800">DEV</option>
                                    <option value="test" className="bg-gray-800">TEST</option>
                                    <option value="infra" className="bg-gray-800">INFRA</option>
                                    <option value="support" className="bg-gray-800">SUPPORT</option>
                                  </select>
                                </td>
                                <td rowSpan={totalRows} className="sticky left-[120px] z-10 bg-gray-900 border border-gray-700 px-4 py-3">
                                  <div className="font-medium flex items-center gap-2">
                                    {task.name}
                                    <button
                                      onClick={() => setShowEditTask({ taskId: task.id, taskName: task.name })}
                                      className="text-gray-400 hover:text-blue-400 transition-colors"
                                      title="Edit task name"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteTask({ taskId: task.id, taskName: task.name })}
                                      className="text-gray-400 hover:text-red-400 transition-colors"
                                      title="Delete task"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      onClick={() => setShowAddSubtask({ taskId: task.id, taskName: task.name })}
                                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-2"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Subtask
                                    </button>
                                  )}
                                  {otherSubtasks.length > 0 && (
                                    <button
                                      onClick={() => toggleTaskSubtasks(task.id)}
                                      className="text-gray-400 hover:text-gray-300 text-xs flex items-center gap-1 mt-2"
                                    >
                                      {isHidden ? 'Show Subtasks' : 'Hide Subtasks'}
                                    </button>
                                  )}
                                </td>
                              </>
                            )}
                            <td className="sticky left-[300px] z-10 border border-gray-700 px-4 py-3 font-semibold" style={{ backgroundColor: hexToRgba(rowColors.actual, rowColors.actualOpacity) }}>ACTUAL</td>
                            <td className="sticky left-[450px] z-10 border border-gray-700 px-2 py-3 text-gray-500 text-xs" style={{ backgroundColor: hexToRgba(rowColors.actual, rowColors.actualOpacity) }}>-</td>
                            {dateRange.map(date => {
                              const milestoneText = actualMilestones[date];
                              return (
                                <td key={date} className="border border-gray-700 px-2 py-2 align-top" style={{ backgroundColor: getActualRowColor(milestoneText) }}>
                                  {milestoneText && (
                                    <div className={`text-xs px-2 py-1 rounded ${getMilestoneColor(milestoneText)}`}>
                                      {milestoneText}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Other Subtasks */}
                          {visibleSubtasks.map((st) => (
                            <React.Fragment key={st.subtask.id}>
                              <tr className="hover:bg-gray-800/50">
                                <td className="sticky left-[300px] z-10 bg-gray-900 border border-gray-700 px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {st.subtask.name}
                                    <button
                                      onClick={() => setShowEditSubtask({ subtaskId: st.subtask.id, subtaskName: st.subtask.name })}
                                      className="text-gray-400 hover:text-blue-400 transition-colors"
                                      title="Edit subtask name"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteSubtask({ subtaskId: st.subtask.id, subtaskName: st.subtask.name })}
                                      className="text-gray-400 hover:text-red-400 transition-colors"
                                      title="Delete subtask"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      onClick={() => setShowAddSubSubtask({ subtaskId: st.subtask.id, subtaskName: st.subtask.name })}
                                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Sub-Subtask
                                    </button>
                                  )}
                                </td>
                                <td className="sticky left-[450px] z-10 bg-gray-900 border border-gray-700 px-2 py-3">
                                  <select
                                    value={st.subtask.assigned_to || ''}
                                    onChange={(e) => handleAssignmentChange(st.subtask.id, e.target.value || null)}
                                    disabled={!isAdmin}
                                    className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="">Unassigned</option>
                                    {users.map(u => (
                                      <option key={u.id} value={u.id}>
                                        {u.full_name} ({u.role})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                {dateRange.map(date => {
                                  const milestonesForDate = st.milestones.filter(m => m.milestone_date === date);
                                  return (
                                    <td key={date} className="border border-gray-700 px-2 py-2 bg-gray-900 align-top">
                                      <div className="space-y-1">
                                        {milestonesForDate.map(milestone => (
                                          <div
                                            key={milestone.id}
                                            onClick={() => setShowMilestone({
                                              subtaskId: st.subtask.id,
                                              subtaskName: st.subtask.name,
                                              date
                                            })}
                                            className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 ${getMilestoneColor(milestone.milestone_text)}`}
                                          >
                                            {milestone.milestone_text}
                                          </div>
                                        ))}
                                        {openDropdown === `subtask-${st.subtask.id}-${date}` ? (
                                          <select
                                            autoFocus
                                            defaultValue=""
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                handleAddMilestone(st.subtask.id, null, date, e.target.value);
                                                setOpenDropdown(null);
                                              }
                                            }}
                                            onBlur={() => setOpenDropdown(null)}
                                            className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          >
                                            <option value="">Select...</option>
                                            {milestoneOptions.map(option => (
                                              <option key={option.value} value={option.label}>{option.label}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <button
                                            onClick={() => setOpenDropdown(`subtask-${st.subtask.id}-${date}`)}
                                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-xs rounded flex items-center justify-center"
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                              {st.subSubtasks.map(sst => (
                                <tr key={sst.subSubtask.id} className="hover:bg-gray-800/50 bg-gray-900/50">
                                  <td className="sticky left-[300px] z-10 bg-gray-800 border border-gray-700 px-4 py-3 pl-8">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-400">↳</span> {sst.subSubtask.name}
                                      <button
                                        onClick={() => setShowEditSubSubtask({ subSubtaskId: sst.subSubtask.id, subSubtaskName: sst.subSubtask.name, parentSubtaskName: st.subtask.name })}
                                        className="text-gray-400 hover:text-blue-400 transition-colors"
                                        title="Edit sub-subtask name"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setShowDeleteSubSubtask({ subSubtaskId: sst.subSubtask.id, subSubtaskName: sst.subSubtask.name })}
                                        className="text-gray-400 hover:text-red-400 transition-colors"
                                        title="Delete sub-subtask"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="sticky left-[450px] z-10 bg-gray-800 border border-gray-700 px-2 py-3">
                                    <select
                                      value={sst.subSubtask.assigned_to || ''}
                                      onChange={(e) => handleSubSubtaskAssignmentChange(sst.subSubtask.id, e.target.value || null)}
                                      disabled={!isAdmin}
                                      className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <option value="">Unassigned</option>
                                      {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.full_name} ({u.role})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  {dateRange.map(date => {
                                    const milestonesForDate = sst.milestones.filter(m => m.milestone_date === date);
                                    return (
                                      <td key={date} className="border border-gray-700 px-2 py-2 bg-gray-800 align-top">
                                        <div className="space-y-1">
                                          {milestonesForDate.map(milestone => (
                                            <div
                                              key={milestone.id}
                                              onClick={() => setShowMilestone({
                                                subSubtaskId: sst.subSubtask.id,
                                                subtaskName: `${st.subtask.name} → ${sst.subSubtask.name}`,
                                                date
                                              })}
                                              className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 ${getMilestoneColor(milestone.milestone_text)}`}
                                            >
                                              {milestone.milestone_text}
                                            </div>
                                          ))}
                                          {openDropdown === `subsubtask-${sst.subSubtask.id}-${date}` ? (
                                            <select
                                              autoFocus
                                              defaultValue=""
                                              onChange={(e) => {
                                                if (e.target.value) {
                                                  handleAddMilestone(null, sst.subSubtask.id, date, e.target.value);
                                                  setOpenDropdown(null);
                                                }
                                              }}
                                              onBlur={() => setOpenDropdown(null)}
                                              className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="">Select...</option>
                                              {milestoneOptions.map(option => (
                                                <option key={option.value} value={option.label}>{option.label}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <button
                                              onClick={() => setOpenDropdown(`subsubtask-${sst.subSubtask.id}-${date}`)}
                                              className="w-6 h-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-xs rounded flex items-center justify-center"
                                            >
                                              +
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
                {groupedData.length === 0 && (
                  <tr>
                    <td colSpan={4 + dateRange.length} className="text-center py-8 text-gray-400">
                      No tasks yet. Click "Add Task" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddTaskModal isOpen={showAddTask} onClose={() => setShowAddTask(false)} />
      <AddPersonModal isOpen={showAddPerson} onClose={() => setShowAddPerson(false)} users={users} />

      {showAddSubtask && (
        <AddSubtaskModal
          isOpen={true}
          onClose={() => setShowAddSubtask(null)}
          taskId={showAddSubtask.taskId}
          taskName={showAddSubtask.taskName}
          users={users}
        />
      )}

      {showAddSubSubtask && (
        <AddSubSubtaskModal
          isOpen={true}
          onClose={() => setShowAddSubSubtask(null)}
          subtaskId={showAddSubSubtask.subtaskId}
          subtaskName={showAddSubSubtask.subtaskName}
        />
      )}

      {showMilestone && (
        <MilestoneModal
          isOpen={true}
          onClose={() => setShowMilestone(null)}
          subtaskId={showMilestone.subtaskId}
          subSubtaskId={showMilestone.subSubtaskId}
          subtaskName={showMilestone.subtaskName}
          date={showMilestone.date}
          existingMilestones={
            showMilestone.subtaskId
              ? groupedData
                  .flatMap(g => g.subtasks)
                  .find(st => st.subtask.id === showMilestone.subtaskId)?.milestones || []
              : groupedData
                  .flatMap(g => g.subtasks)
                  .flatMap(st => st.subSubtasks)
                  .find(sst => sst.subSubtask.id === showMilestone.subSubtaskId)?.milestones || []
          }
          onDataChange={refetch}
        />
      )}

      {showEditTask && (
        <EditTaskModal
          isOpen={true}
          onClose={() => setShowEditTask(null)}
          taskId={showEditTask.taskId}
          taskName={showEditTask.taskName}
          taskPriority={showEditTask.taskPriority}
          onSuccess={refetch}
        />
      )}

      {showEditSubtask && (
        <EditSubtaskModal
          isOpen={true}
          onClose={() => setShowEditSubtask(null)}
          subtaskId={showEditSubtask.subtaskId}
          subtaskName={showEditSubtask.subtaskName}
          onSuccess={refetch}
        />
      )}

      {showEditSubSubtask && (
        <EditSubSubtaskModal
          isOpen={true}
          onClose={() => setShowEditSubSubtask(null)}
          subSubtaskId={showEditSubSubtask.subSubtaskId}
          subSubtaskName={showEditSubSubtask.subSubtaskName}
          parentSubtaskName={showEditSubSubtask.parentSubtaskName}
          onSuccess={refetch}
        />
      )}

      {showDeleteTask && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setShowDeleteTask(null)}
          onConfirm={() => handleDeleteTask(showDeleteTask.taskId)}
          itemType="task"
          itemName={showDeleteTask.taskName}
        />
      )}

      {showDeleteSubtask && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setShowDeleteSubtask(null)}
          onConfirm={() => handleDeleteSubtask(showDeleteSubtask.subtaskId)}
          itemType="subtask"
          itemName={showDeleteSubtask.subtaskName}
        />
      )}

      {showDeleteSubSubtask && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setShowDeleteSubSubtask(null)}
          onConfirm={() => handleDeleteSubSubtask(showDeleteSubSubtask.subSubtaskId)}
          itemType="sub-subtask"
          itemName={showDeleteSubSubtask.subSubtaskName}
        />
      )}
    </div>
  );
};
