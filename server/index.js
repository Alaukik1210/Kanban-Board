import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/collaborative-todo', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Task Schema
const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assignedUser: { type: String, required: true },
  status: { type: String, enum: ['Todo', 'In Progress', 'Done'], default: 'Todo' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
});

// Action Log Schema
const actionSchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true },
  taskId: { type: String, required: true },
  taskTitle: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Action = mongoose.model('Action', actionSchema);

// JWT Secret
const JWT_SECRET = 'your-secret-key-change-in-production';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    // Generate JWT
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET);
    
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET);
    
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, assignedUser, priority } = req.body;
    
    // Check for unique title
    const existingTask = await Task.findOne({ title });
    if (existingTask) {
      return res.status(400).json({ error: 'Task title must be unique' });
    }

    // Check if title matches column names
    const columnNames = ['Todo', 'In Progress', 'Done'];
    if (columnNames.includes(title)) {
      return res.status(400).json({ error: 'Task title cannot match column names' });
    }

    const task = new Task({
      id: uuidv4(),
      title,
      description,
      assignedUser,
      priority
    });

    await task.save();

    // Log action
    const action = new Action({
      user: req.user.username,
      action: 'created',
      taskId: task.id,
      taskTitle: task.title
    });
    await action.save();

    io.emit('taskCreated', task);
    io.emit('actionLogged', action);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, assignedUser, status, priority, version } = req.body;
    
    const task = await Task.findOne({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check for version conflicts
    if (task.version !== version) {
      return res.status(409).json({ 
        error: 'Conflict detected', 
        serverVersion: task,
        clientVersion: req.body
      });
    }

    // Check for unique title if changed
    if (title !== task.title) {
      const existingTask = await Task.findOne({ title });
      if (existingTask) {
        return res.status(400).json({ error: 'Task title must be unique' });
      }
    }

    // Update task
    task.title = title;
    task.description = description;
    task.assignedUser = assignedUser;
    task.status = status;
    task.priority = priority;
    task.updatedAt = new Date();
    task.version += 1;

    await task.save();

    // Log action
    const action = new Action({
      user: req.user.username,
      action: 'updated',
      taskId: task.id,
      taskTitle: task.title
    });
    await action.save();

    io.emit('taskUpdated', task);
    io.emit('actionLogged', action);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await Task.deleteOne({ id: req.params.id });

    // Log action
    const action = new Action({
      user: req.user.username,
      action: 'deleted',
      taskId: task.id,
      taskTitle: task.title
    });
    await action.save();

    io.emit('taskDeleted', req.params.id);
    io.emit('actionLogged', action);

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/actions', authenticateToken, async (req, res) => {
  try {
    const actions = await Action.find().sort({ timestamp: -1 }).limit(20);
    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/smart-assign/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all users and their active task counts
    const users = await User.find();
    const userTaskCounts = await Promise.all(
      users.map(async (user) => {
        const count = await Task.countDocuments({
          assignedUser: user.username,
          status: { $in: ['Todo', 'In Progress'] }
        });
        return { username: user.username, count };
      })
    );

    // Find user with fewest active tasks
    const userWithFewestTasks = userTaskCounts.reduce((min, current) => 
      current.count < min.count ? current : min
    );

    // Update task assignment
    task.assignedUser = userWithFewestTasks.username;
    task.updatedAt = new Date();
    task.version += 1;

    await task.save();

    // Log action
    const action = new Action({
      user: req.user.username,
      action: 'smart-assigned',
      taskId: task.id,
      taskTitle: task.title
    });
    await action.save();

    io.emit('taskUpdated', task);
    io.emit('actionLogged', action);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, { username: 1, email: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});