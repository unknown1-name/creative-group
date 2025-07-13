import mongoose from 'mongoose';
const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }
});
export default mongoose.model('Message', messageSchema);
