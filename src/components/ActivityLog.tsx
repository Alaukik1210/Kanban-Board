import React from 'react';
import { Action } from '../types';
import { Activity, Clock } from 'lucide-react';

interface ActivityLogProps {
  actions: Action[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ actions }) => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return '✨';
      case 'updated':
        return '✏️';
      case 'deleted':
        return '🗑️';
      case 'smart-assigned':
        return '🤖';
      default:
        return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'text-green-600';
      case 'updated':
        return 'text-blue-600';
      case 'deleted':
        return 'text-red-600';
      case 'smart-assigned':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const actionTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - actionTime.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-800">Recent Activity</h3>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {actions.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          actions.map((action) => (
            <div key={action._id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
              <div className="text-lg">{getActionIcon(action.action)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{action.user}</span>{' '}
                  <span className={getActionColor(action.action)}>{action.action}</span>{' '}
                  task "<span className="font-medium">{action.taskTitle}</span>"
                </p>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(action.timestamp)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityLog;