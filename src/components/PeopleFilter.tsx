import React from 'react';
import { User } from '../types';
import { Users } from 'lucide-react';

interface PeopleFilterProps {
  users: User[];
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
}

export const PeopleFilter: React.FC<PeopleFilterProps> = ({ users, selectedUserId, onUserChange }) => {
  return (
    <div className="flex items-center gap-3">
      <Users className="w-5 h-5 text-gray-400" />
      <select
        value={selectedUserId || ''}
        onChange={(e) => onUserChange(e.target.value || null)}
        className="bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All People</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.full_name} ({user.role})
          </option>
        ))}
      </select>
    </div>
  );
};
