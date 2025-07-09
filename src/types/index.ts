export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedUser: string;
  status: 'Todo' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Action {
  _id: string;
  user: string;
  action: string;
  taskId: string;
  taskTitle: string;
  timestamp: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface ConflictData {
  serverVersion: Task;
  clientVersion: Task;
}