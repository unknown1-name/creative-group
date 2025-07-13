import express from 'express';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import User from '../models/User.js';
import config from '../config.js';

const router = express.Router();

function auth(req, res, next) {
  let token = req.headers['authorization'];
  if (!token) return res.sendStatus(403);
  token = token.replace('Bearer ', '');
  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
    next();
  });
}

// إرسال رسالة من موظف للمدير
router.post('/send', auth, async (req, res) => {
  const from = await User.findById(req.user.id);
  if (!from) return res.json({ msg: 'مستخدم غير موجود!' });
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) return res.json({ msg: 'لا يوجد مدير!' });
  const msg = new Message({ from: from._id, to: admin._id, content: req.body.content });
  await msg.save();
  res.json({ msg: "Message sent" });
});

// محادثة الموظف مع المدير
router.get('/user/conversation', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.json([]);
  const admin = await User.findOne({ role: 'admin' });
  const messages = await Message.find({ $or: [
    { from: user._id, to: admin._id },
    { from: admin._id, to: user._id }
  ]})
    .sort({ createdAt: 1 })
    .populate('from', 'username')
    .populate('replyTo');
  res.json(messages.filter(msg => msg.from));
});

// رسالة مدير لموظف
router.post('/admin/send', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { to, content, replyTo } = req.body;
  const user = await User.findById(to);
  const admin = await User.findOne({ role: 'admin' });
  if (!user) return res.json({ msg: 'موظف غير موجود!' });
  const msg = new Message({
    from: admin._id,
    to: user._id,
    content,
    replyTo: replyTo || null
  });
  await msg.save();
  res.json({ msg: "تم الإرسال" });
});

// محادثة مدير مع موظف واحد
router.get('/admin/conversation/:userId', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const admin = await User.findOne({ role: 'admin' });
  const user = await User.findById(req.params.userId);
  if (!user) return res.json([]);
  const messages = await Message.find({ $or: [
    { from: user._id, to: admin._id },
    { from: admin._id, to: user._id }
  ]})
    .sort({ createdAt: 1 })
    .populate('from', 'username')
    .populate('replyTo');
  res.json(messages.filter(msg => msg.from));
});

// حذف رسالة (للمدير فقط)
router.delete('/admin/message/:msgId', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await Message.findByIdAndDelete(req.params.msgId);
  res.json({ msg: "تم حذف الرسالة" });
});

export default router;
