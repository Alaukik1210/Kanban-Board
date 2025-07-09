import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Task from '../models/Task.js';
import Action from '../models/Action.js';
import User from '../models/User.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, assignedUser, priority } = req.body;
    const existingTask = await Task.findOne({ title });
    if (existingTask) return res.status(400).json({ error: 'Task title must be unique' });

    const columnNames = ['Todo', 'In Progress', 'Done'];
    if (columnNames.includes(title)) {
      return res.status(400).json({ error: 'Task title cannot match column names' });
    }

    const task = new Task({ id: uuidv4(), title, description, assignedUser, priority });
    await task.save();

    const action = new Action({ user: req.user.username, action: 'created', taskId: task.id, taskTitle: task.title });
    await action.save();

    global.io.emit('taskCreated', task);
    global.io.emit('actionLogged', action);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, assignedUser, status, priority, version } = req.body;
    const task = await Task.findOne({ id: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.version !== version) {
      return res.status(409).json({ error: 'Conflict detected', serverVersion: task, clientVersion: req.body });
    }

    if (title !== task.title) {
      const existingTask = await Task.findOne({ title });
      if (existingTask) return res.status(400).json({ error: 'Task title must be unique' });
    }

    Object.assign(task, { title, description, assignedUser, status, priority, updatedAt: new Date(), version: task.version + 1 });
    await task.save();

    const action = new Action({ user: req.user.username, action: 'updated', taskId: task.id, taskTitle: task.title });
    await action.save();

    global.io.emit('taskUpdated', task);
    global.io.emit('actionLogged', action);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await Task.deleteOne({ id: req.params.id });
    const action = new Action({ user: req.user.username, action: 'deleted', taskId: task.id, taskTitle: task.title });
    await action.save();

    global.io.emit('taskDeleted', req.params.id);
    global.io.emit('actionLogged', action);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/actions', authenticateToken, async (req, res) => {
  try {
    const actions = await Action.find().sort({ timestamp: -1 }).limit(20);
    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/smart-assign/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ id: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const users = await User.find();
    const userTaskCounts = await Promise.all(users.map(async (user) => {
      const count = await Task.countDocuments({ assignedUser: user.username, status: { $in: ['Todo', 'In Progress'] } });
      return { username: user.username, count };
    }));
    const userWithFewestTasks = userTaskCounts.reduce((min, current) => current.count < min.count ? current : min);

    task.assignedUser = userWithFewestTasks.username;
    task.updatedAt = new Date();
    task.version += 1;
    await task.save();

    const action = new Action({ user: req.user.username, action: 'smart-assigned', taskId: task.id, taskTitle: task.title });
    await action.save();

    global.io.emit('taskUpdated', task);
    global.io.emit('actionLogged', action);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
