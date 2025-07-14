import express from 'express';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import User from '../models/User.js';
import config from '../config.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// ========== auth middleware ==========
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

// ========== Multer Setup ==========
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
function fileFilter(req, file, cb) {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images are allowed!'), false);
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB Max

// ========== إرسال رسالة من موظف للمدير (نص أو صورة) ==========
router.post('/send', auth, upload.single('image'), async (req, res) => {
  try {
    const from = await User.findById(req.user.id);
    if (!from) return res.json({ msg: 'مستخدم غير موجود!' });
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) return res.json({ msg: 'لا يوجد مدير!' });

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const msg = new Message({
      from: from._id,
      to: admin._id,
      content: req.body.content || '',
      image: imageUrl
    });
    await msg.save();
    res.json({ msg: "تم إرسال الرسالة", message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== محادثة الموظف مع المدير ==========
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

// ========== رسالة مدير لموظف (يدعم صورة) ==========
router.post('/admin/send', auth, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { to, content, replyTo } = req.body;
  const user = await User.findById(to);
  const admin = await User.findOne({ role: 'admin' });
  if (!user) return res.json({ msg: 'موظف غير موجود!' });

  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
  }

  const msg = new Message({
    from: admin._id,
    to: user._id,
    content,
    replyTo: replyTo || null,
    image: imageUrl
  });
  await msg.save();
  res.json({ msg: "تم الإرسال", message: msg });
});

// ========== محادثة مدير مع موظف واحد ==========
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

// ========== حذف رسالة (للمدير فقط) ==========
router.delete('/admin/message/:msgId', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await Message.findByIdAndDelete(req.params.msgId);
  res.json({ msg: "تم حذف الرسالة" });
});

// ========== خدمة الصور statically ==========
router.use('/uploads', express.static('uploads'));

// ========= نهاية الراوتر =========
export default router;
