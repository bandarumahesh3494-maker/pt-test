import React, { useState, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTrackerData } from '../hooks/useTrackerData';
import { DayDetailModal } from './DayDetailModal';
import { PeopleFilter } from './PeopleFilter';

interface DayEntry {
  taskName: string;
  subtaskName: string;
  milestoneText: string;
  engineerName: string;
  engineerId: string;
  category: string;
}

interface DayData {
  date: string;
  entries: DayEntry[];
  uniqueEngineers: Set<string>;
}

export const CalendarDashboard: React.FC = () => {
  const { groupedData, users, loading, error } = useTrackerData();
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showMilestones, setShowMilestones] = useState(true);
  const [milestoneFilter, setMilestoneFilter] = useState<string>('all');
  const [showPlanned, setShowPlanned] = useState(true);
  const [showActual, setShowActual] = useState(true);
  const [showTaskLevelOnly, setShowTaskLevelOnly] = useState(false);
  const [hideClosedTasks, setHideClosedTasks] = useState(false);

  const isTaskClosed = (subtasks: any[]) => {
    return subtasks.some(st =>
      st.milestones.some((m: any) => m.milestone_text.toUpperCase() === 'CLOSED')
    );
  };

  const calendarData = useMemo(() => {
    const dayMap = new Map<string, DayData>();

    groupedData
      .filter(({ task, subtasks }) => {
        if (hideClosedTasks) {
          return !isTaskClosed(subtasks);
        }
        return true;
      })
      .forEach(({ task, subtasks }) => {
      subtasks.forEach(({ subtask, milestones, subSubtasks, assignedUser }) => {
        milestones.forEach(milestone => {
          const date = milestone.milestone_date;
          if (!dayMap.has(date)) {
            dayMap.set(date, {
              date,
              entries: [],
              uniqueEngineers: new Set()
            });
          }

          const dayData = dayMap.get(date)!;
          const engineerName = assignedUser?.full_name || 'Unassigned';
          const engineerId = assignedUser?.id || '';

          dayData.entries.push({
            taskName: task.name,
            subtaskName: subtask.name,
            milestoneText: milestone.milestone_text,
            engineerName,
            engineerId,
            category: task.category
          });

          if (engineerId) {
            dayData.uniqueEngineers.add(engineerId);
          }
        });

        subSubtasks.forEach(({ subSubtask, milestones: subMilestones }) => {
          subMilestones.forEach(milestone => {
            const date = milestone.milestone_date;
            if (!dayMap.has(date)) {
              dayMap.set(date, {
                date,
                entries: [],
                uniqueEngineers: new Set()
              });
            }

            const dayData = dayMap.get(date)!;
            const engineerName = assignedUser?.full_name || 'Unassigned';
            const engineerId = assignedUser?.id || '';

            dayData.entries.push({
              taskName: task.name,
              subtaskName: `${subtask.name} → ${subSubtask.name}`,
              milestoneText: milestone.milestone_text,
              engineerName,
              engineerId,
              category: task.category
            });

            if (engineerId) {
              dayData.uniqueEngineers.add(engineerId);
            }
          });
        });
      });
    });

    return dayMap;
  }, [groupedData, hideClosedTasks]);

  const filteredCalendarData = useMemo(() => {
    const filtered = new Map<string, DayData>();
    calendarData.forEach((dayData, date) => {
      let filteredEntries = dayData.entries;

      if (selectedUserId) {
        filteredEntries = filteredEntries.filter(entry => entry.engineerId === selectedUserId);
      }

      if (milestoneFilter !== 'all') {
        filteredEntries = filteredEntries.filter(entry => entry.milestoneText === milestoneFilter);
      }

      if (!showPlanned) {
        filteredEntries = filteredEntries.filter(entry => {
          const subtaskBase = entry.subtaskName.split(' → ')[0];
          return subtaskBase.toUpperCase() !== 'PLANNED';
        });
      }

      if (!showActual) {
        filteredEntries = filteredEntries.filter(entry => {
          const subtaskBase = entry.subtaskName.split(' → ')[0];
          return subtaskBase.toUpperCase() !== 'ACTUAL';
        });
      }

      if (showTaskLevelOnly) {
        filteredEntries = filteredEntries.filter(entry => {
          const subtaskBase = entry.subtaskName.split(' → ')[0].trim().toUpperCase();
          return subtaskBase === 'ACTUAL' || subtaskBase === 'PLANNED';
        });
      }

      if (filteredEntries.length > 0) {
        const uniqueEngineers = new Set<string>();
        filteredEntries.forEach(entry => {
          if (entry.engineerId) {
            uniqueEngineers.add(entry.engineerId);
          }
        });

        filtered.set(date, {
          date,
          entries: filteredEntries,
          uniqueEngineers
        });
      }
    });
    return filtered;
  }, [calendarData, selectedUserId, milestoneFilter, showPlanned, showActual, showTaskLevelOnly]);

  const milestoneTypes = useMemo(() => {
    const types = new Set<string>();
    calendarData.forEach(dayData => {
      dayData.entries.forEach(entry => {
        types.add(entry.milestoneText);
      });
    });
    return Array.from(types).sort();
  }, [calendarData]);

  const weeks = useMemo(() => {
    const sortedDates = Array.from(filteredCalendarData.keys()).sort();
    if (sortedDates.length === 0) return [];

    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);

    const firstDayOfWeek = new Date(startDate);
    firstDayOfWeek.setDate(startDate.getDate() - startDate.getDay());

    const lastDayOfWeek = new Date(endDate);
    lastDayOfWeek.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const weeks: Date[][] = [];
    let currentWeekStart = new Date(firstDayOfWeek);

    while (currentWeekStart <= lastDayOfWeek) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeekStart);
        day.setDate(currentWeekStart.getDate() + i);
        week.push(day);
      }
      weeks.push(week);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeks;
  }, [filteredCalendarData]);

  const getEngineerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getEngineerColor = (engineerId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-orange-500'
    ];
    const index = engineerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
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
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <PeopleFilter
          users={users}
          selectedUserId={selectedUserId}
          onUserChange={setSelectedUserId}
        />

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

        <button
          onClick={() => setShowMilestones(!showMilestones)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
        >
          {showMilestones ? (
            <>
              <Eye className="w-4 h-4" />
              <span>Hide Milestones</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Show Milestones</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShowPlanned(!showPlanned)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showPlanned
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-700'
              : 'bg-gray-700/50 hover:bg-gray-700 border-gray-600'
          }`}
        >
          {showPlanned ? (
            <>
              <Eye className="w-4 h-4" />
              <span>PLANNED</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span>PLANNED</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShowActual(!showActual)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showActual
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-700'
              : 'bg-gray-700/50 hover:bg-gray-700 border-gray-600'
          }`}
        >
          {showActual ? (
            <>
              <Eye className="w-4 h-4" />
              <span>ACTUAL</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span>ACTUAL</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShowTaskLevelOnly(!showTaskLevelOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showTaskLevelOnly
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-700'
              : 'bg-gray-700/50 hover:bg-gray-700 border-gray-600'
          }`}
        >
          {showTaskLevelOnly ? (
            <>
              <Eye className="w-4 h-4" />
              <span>Task Level Only</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Task Level Only</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="milestone-filter" className="text-sm font-medium text-gray-300">
            Milestone Type:
          </label>
          <select
            id="milestone-filter"
            value={milestoneFilter}
            onChange={(e) => setMilestoneFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Milestones</option>
            <option value="CLOSED">CLOSED</option>
            {milestoneTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No calendar data available. Add some milestones to see them here.
        </div>
      ) : (
        <div className="space-y-4">
          {weeks.map((week, weekIndex) => {
            const weekStart = week[0];
            const weekEnd = week[6];
            const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

            return (
              <div key={weekIndex} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div className="bg-gray-750 px-4 py-2 font-semibold text-sm border-b border-gray-700">
                  {weekLabel}
                </div>
                <div className="grid grid-cols-7 gap-px bg-gray-700">
                  {week.map((day, dayIndex) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const dayData = filteredCalendarData.get(dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const hasEntries = dayData && dayData.entries.length > 0;

                    return (
                      <div
                        key={dayIndex}
                        onClick={() => dayData && setSelectedDay(dayData)}
                        className={`bg-gray-800 p-3 min-h-[100px] ${hasEntries ? 'cursor-pointer hover:bg-gray-750' : ''} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className="text-sm font-semibold mb-2">
                          <div className={`${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className={`text-lg ${isToday ? 'text-blue-400' : 'text-white'}`}>
                            {day.getDate()}
                          </div>
                        </div>

                        {hasEntries && (
                          <div className="space-y-1">
                            {showMilestones ? (
                              <div className="space-y-1">
                                {dayData.entries.slice(0, 3).map((entry, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs bg-gray-700/50 rounded px-2 py-1 border-l-2 border-blue-500"
                                  >
                                    <div className="font-semibold text-blue-300 truncate" title={entry.taskName}>
                                      {entry.taskName}
                                    </div>
                                    <div className="text-gray-300 truncate" title={entry.milestoneText}>
                                      {entry.milestoneText}
                                    </div>
                                  </div>
                                ))}
                                {dayData.entries.length > 3 && (
                                  <div className="text-xs text-gray-400 pl-2">
                                    +{dayData.entries.length - 3} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="text-xs text-gray-400">
                                  {dayData.entries.length} {dayData.entries.length === 1 ? 'entry' : 'entries'}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {Array.from(dayData.uniqueEngineers).map(engineerId => {
                                    const user = users.find(u => u.id === engineerId);
                                    if (!user) return null;
                                    return (
                                      <div
                                        key={engineerId}
                                        className={`text-xs px-2 py-1 rounded text-white font-semibold ${getEngineerColor(engineerId)}`}
                                        title={user.full_name}
                                      >
                                        {getEngineerInitials(user.full_name)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDay && (
        <DayDetailModal
          isOpen={true}
          onClose={() => setSelectedDay(null)}
          date={selectedDay.date}
          entries={selectedDay.entries}
        />
      )}
    </div>
  );
};
