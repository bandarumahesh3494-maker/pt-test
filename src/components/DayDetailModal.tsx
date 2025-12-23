import React from 'react';
import { X } from 'lucide-react';

interface DayEntry {
  taskName: string;
  subtaskName: string;
  milestoneText: string;
  engineerName: string;
  category: string;
}

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  entries: DayEntry[];
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ isOpen, onClose, date, entries }) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{formatDate(date)}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No entries for this day
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="border rounded-lg overflow-hidden border-gray-600"
              >
                <div className={`p-3 border-b border-gray-600 ${getCategoryColor(entry.category)}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-white">{entry.taskName}</div>
                    <div className="text-xs px-2 py-1 bg-gray-700 rounded uppercase font-semibold">
                      {entry.category}
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-gray-800">
                  <div className="text-sm text-gray-200 font-medium mb-2">
                    {entry.subtaskName}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 bg-blue-900/50 border border-blue-600 rounded">
                      {entry.milestoneText}
                    </span>
                    <span className="text-sm text-gray-400">
                      {entry.engineerName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
