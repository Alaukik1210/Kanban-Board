import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import dotenv from 'dotenv'


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ 'https://kanban-board-lilac-seven.vercel.app',
  'http://localhost:5173'],
    methods: ["GET", "POST"]
  }
});

global.io = io;
app.use(cors({
  origin: [
    'https://kanban-board-lilac-seven.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true,
}));
app.use(express.json());

connectDB();

app.use('/api', userRoutes);
app.use('/api', taskRoutes);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
