import React, { useState } from 'react';
import { Task, User } from '../types';
import { Edit, Trash2, User as UserIcon, Brain, AlertTriangle } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  users: User[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onSmartAssign: (id: string) => void;
  isDragging?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  // users,
  onEdit,
  onDelete,
  onSmartAssign,
  isDragging = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500';
      case 'Medium':
        return 'bg-yellow-500';
      case 'Low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // const assignedUser = users.find(user => user.username === task.assignedUser);

  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-3 cursor-grab transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-lg'
      } ${isHovered ? 'transform scale-102' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
            {task.status}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onSmartAssign(task.id)}
            className="p-1 text-gray-500 hover:text-purple-600 transition-colors"
            title="Smart Assign"
          >
            <Brain className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
            title="Edit Task"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-gray-800 mb-2 text-sm">{task.title}</h3>
      
      {task.description && (
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <UserIcon className="w-3 h-3" />
          <span>{task.assignedUser}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="capitalize">{task.priority}</span>
          {task.priority === 'High' && (
            <AlertTriangle className="w-3 h-3 text-red-500" />
          )}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          Updated: {new Date(task.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;