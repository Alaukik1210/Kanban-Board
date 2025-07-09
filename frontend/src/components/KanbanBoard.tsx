import React, { useState, useEffect } from 'react';
import { Task, User, Action, ConflictData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import ConflictModal from './ConflictModal';
import ActivityLog from './ActivityLog';
import { Plus, LogOut } from 'lucide-react';

const KanbanBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [conflict, setConflict] = useState<ConflictData | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  
  const { user, token, logout } = useAuth();
  const socket = useSocket('https://disciplined-mercy.railway.app');

  useEffect(() => {
    if (socket) {
      socket.on('taskCreated', (task: Task) => {
        setTasks(prev => [task, ...prev]);
      });

      socket.on('taskUpdated', (task: Task) => {
        setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      });

      socket.on('taskDeleted', (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      });

      socket.on('actionLogged', (action: Action) => {
        setActions(prev => [action, ...prev.slice(0, 19)]);
      });

      return () => {
        socket.off('taskCreated');
        socket.off('taskUpdated');
        socket.off('taskDeleted');
        socket.off('actionLogged');
      };
    }
  }, [socket]);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchActions();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('https://disciplined-mercy.railway.app/api/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setTasks(data);
    } catch {
      setError('Failed to fetch tasks');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('https://disciplined-mercy.railway.app/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUsers(data);
    } catch  {
      setError('Failed to fetch users');
    }
  };

  const fetchActions = async () => {
    try {
      const response = await fetch('https://disciplined-mercy.railway.app/api/actions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setActions(data);
    } catch  {
      setError('Failed to fetch actions');
    }
  };

  const handleCreateTask = () => {
    setModalMode('create');
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setModalMode('edit');
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      const url = modalMode === 'create' 
        ? 'https://disciplined-mercy.railway.app/api/tasks'
        : `https://disciplined-mercy.railway.app/api/tasks/${taskData.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });

      if (response.status === 409) {
        const conflictData = await response.json();
        setConflict({
          serverVersion: conflictData.serverVersion,
          clientVersion: taskData as Task,
        });
        setIsConflictModalOpen(true);
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save task');
      }

      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`https://disciplined-mercy.railway.app/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete task');
    }
  };

  const handleSmartAssign = async (taskId: string) => {
    try {
      const response = await fetch(`https://disciplined-mercy.railway.app/api/smart-assign/${taskId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to smart assign task');
      }

      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to smart assign task');
    }
  };

  const handleConflictResolve = async (resolvedTask: Task) => {
    try {
      const response = await fetch(`https://disciplined-mercy.railway.app/api/tasks/${resolvedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...resolvedTask,
          version: conflict?.serverVersion.version || resolvedTask.version,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve conflict');
      }

      setConflict(null);
      setIsConflictModalOpen(false);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to resolve conflict');
    }
  };

  // const handleDragStart = (e: React.DragEvent, taskId: string) => {
  //   setDraggedTask(taskId);
  //   e.dataTransfer.effectAllowed = 'move';
  // };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.status !== status) {
      try {
        const response = await fetch(`https://disciplined-mercy.railway.app/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...task,
            status,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update task status');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to update task status');
      }
    }
    
    setDraggedTask(null);
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo':
        return 'bg-gradient-to-r from-blue-500 to-purple-500';
      case 'In Progress':
    return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
  case 'Done':
    return 'bg-gradient-to-r from-green-400 to-green-600';
  default:
    return 'bg-gradient-to-r from-gray-400 to-gray-600';
    }
  };

  const columns: { status: Task['status']; title: string }[] = [
    { status: 'Todo', title: 'To Do' },
    { status: 'In Progress', title: 'In Progress' },
    { status: 'Done', title: 'Done' },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50">
      <header className="bg-gradient-to-r from-[#f9faff] to-[#f9faff] px-6 py-6 shadow-sm">
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
   
    <div>
      <h1 className="text-3xl font-bold text-purple-600">Collaborative Board</h1>
      <p className="text-sm text-gray-500 mt-1">Manage your team's workflow efficiently</p>
    </div>

    
    <div className="flex items-center gap-4">
     
      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
        <div className="bg-gradient-to-tr from-purple-500 to-blue-500 text-white p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A11.955 11.955 0 0112 15c2.612 0 5.02.84 6.879 2.261M15 11a3 3 0 10-6 0 3 3 0 006 0z" />
          </svg>
        </div>
        <span className="text-sm text-gray-700 font-medium">Welcome, {user?.username}</span>
      </div>

      
      <button
        onClick={handleCreateTask}
        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-5 py-2 rounded-full font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Add Task</span>
      </button>
       <button
          onClick={logout}
          className="text-gray-500 hover:text-red-600 transition-colors duration-150"
          title="Logout"
        >
          <LogOut className="w-5 h-5 cursor-pointer" />
        </button>
    </div>
  </div>
</header>


      {error && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-sm">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto  px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {columns.map((column) => (
                <div
                  key={column.status}
                  className="bg-white rounded-lg shadow-xs border border-gray-200"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.status)}
                >
                  <div className={`p-4 rounded-t-lg ${getStatusColor(column.status)} text-white`}>
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">{column.title}</h2>
                      <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                        {getTasksByStatus(column.status).length}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 min-h-[400px]">
                    {getTasksByStatus(column.status).map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        users={users}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onSmartAssign={handleSmartAssign}
                        isDragging={draggedTask === task.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <ActivityLog actions={actions} />
          </div>
        </div>
      </div>

      <TaskModal
        task={selectedTask}
        users={users}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        mode={modalMode}
      />

      <ConflictModal
        conflict={conflict}
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        onResolve={handleConflictResolve}
      />
    </div>
  );
};

export default KanbanBoard;