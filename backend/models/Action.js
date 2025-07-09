import mongoose from 'mongoose';

const actionSchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true },
  taskId: { type: String, required: true },
  taskTitle: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Action', actionSchema);
