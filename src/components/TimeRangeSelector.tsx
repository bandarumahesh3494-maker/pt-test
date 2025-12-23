import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

export type TimeRangeOption = 'last7' | 'next30' | 'last30' | 'next60' | 'custom';

interface TimeRangeSelectorProps {
  onRangeChange: (startDate: string, endDate: string) => void;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ onRangeChange }) => {
  const [selectedRange, setSelectedRange] = useState<TimeRangeOption>('next30');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const calculateDateRange = (option: TimeRangeOption): { start: string; end: string } => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (option) {
      case 'last7':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        end = new Date(today);
        break;
      case 'next30':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        end = new Date(today);
        end.setDate(today.getDate() + 30);
        break;
      case 'last30':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = new Date(today);
        break;
      case 'next60':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        end = new Date(today);
        end.setDate(today.getDate() + 60);
        break;
      default:
        start = new Date(today);
        end = new Date(today);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const handleRangeChange = (option: TimeRangeOption) => {
    if (option === 'custom') {
      setShowCustomModal(true);
      setSelectedRange(option);
    } else {
      setSelectedRange(option);
      const { start, end } = calculateDateRange(option);
      onRangeChange(start, end);
    }
  };

  const handleCustomRangeSubmit = () => {
    if (customStartDate && customEndDate) {
      onRangeChange(customStartDate, customEndDate);
      setShowCustomModal(false);
    }
  };

  const getRangeLabel = () => {
    switch (selectedRange) {
      case 'last7':
        return 'Last 7 Days';
      case 'next30':
        return 'Next 30 Days';
      case 'last30':
        return 'Last 30 Days';
      case 'next60':
        return 'Next 60 Days';
      case 'custom':
        return 'Custom Range';
      default:
        return 'Select Range';
    }
  };

  return (
    <>
      <div className="relative">
        <select
          value={selectedRange}
          onChange={(e) => handleRangeChange(e.target.value as TimeRangeOption)}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="last7">Last 7 Days</option>
          <option value="next30">Next 30 Days (Default)</option>
          <option value="last30">Last 30 Days</option>
          <option value="next60">Next 60 Days</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold text-white">Select Custom Date Range</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomRangeSubmit}
                disabled={!customStartDate || !customEndDate}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
