import React, { useState, useEffect } from 'react';
import { History, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface ActionHistory {
  id: string;
  action_type: 'create' | 'update' | 'delete';
  entity_type: 'task' | 'subtask' | 'sub_subtask' | 'milestone' | 'user';
  entity_id: string;
  entity_name: string;
  details: Record<string, any>;
  performed_by: string | null;
  created_at: string;
}

export const HistoryDashboard: React.FC = () => {
  const { colors } = useTheme();
  const [history, setHistory] = useState<ActionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [filterActionType, setFilterActionType] = useState<string>('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('action_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (fetchError) throw fetchError;
      setHistory(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-500';
      case 'update':
        return 'text-blue-500';
      case 'delete':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-500/20 text-green-500';
      case 'update':
        return 'bg-blue-500/20 text-blue-500';
      case 'delete':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'task':
        return 'Task';
      case 'subtask':
        return 'Subtask';
      case 'sub_subtask':
        return 'Sub-subtask';
      case 'milestone':
        return 'Milestone';
      case 'user':
        return 'User';
      default:
        return type;
    }
  };

  const filteredHistory = history.filter((item) => {
    if (filterEntityType !== 'all' && item.entity_type !== filterEntityType) {
      return false;
    }
    if (filterActionType !== 'all' && item.action_type !== filterActionType) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center`}>
        <div className="text-xl">Loading history...</div>
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
            <History className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold">Action History</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value)}
                className={`${colors.cardBg} ${colors.border} bg-blue-500/10 border rounded-lg px-3 py-2 text-sm`}
              >
                <option value="all">All Types</option>
                <option value="task">Tasks</option>
                <option value="subtask">Subtasks</option>
                <option value="sub_subtask">Sub-subtasks</option>
                <option value="milestone">Milestones</option>
                <option value="user">Users</option>
              </select>
              <select
                value={filterActionType}
                onChange={(e) => setFilterActionType(e.target.value)}
                className={`${colors.cardBg} ${colors.border} bg-blue-500/10 border rounded-lg px-3 py-2 text-sm`}
              >
                <option value="all">All Actions</option>
                <option value="create">Created</option>
                <option value="update">Updated</option>
                <option value="delete">Deleted</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className={`${colors.cardBg} rounded-lg border ${colors.border} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={colors.headerBg}>
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Timestamp</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Entity Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Entity Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Details</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      No history records found
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(item.action_type)}`}>
                          {item.action_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                          {getEntityTypeLabel(item.entity_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {item.entity_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 max-w-md">
                        {item.details && Object.keys(item.details).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(item.details).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}:</span>{' '}
                                <span className="text-gray-500">{JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {item.performed_by || <span className="text-gray-600">System</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-400 text-center">
          Showing {filteredHistory.length} of {history.length} total records
        </div>
      </div>
    </div>
  );
};
