import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

// قائمة الموظفين (للمدير فقط)
router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const users = await User.find({ role: 'user' }).select('-password');
  res.json(users);
});

// إضافة موظف من قبل المدير
router.post('/adduser', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { username, password, phonenumber } = req.body;
  if(!/^01[0-9]{9}$/.test(phonenumber)) return res.json({ msg: 'رقم الموبايل غير صحيح أو غير مصري!' });
  if(password.length < 8) return res.json({ msg: 'كلمة المرور ضعيفة!' });
  let exist = await User.findOne({ $or: [{ username }, { phonenumber }] });
  if (exist) return res.json({ msg: 'اسم المستخدم أو الموبايل مستخدم من قبل!' });
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hash, phonenumber });
  await user.save();
  res.json({ msg: "تم إضافة الموظف" });
});

// حذف موظف
router.delete('/user/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await User.findByIdAndDelete(req.params.id);
  res.json({ msg: "تم حذف الموظف" });
});
// ... بقية الأكواد والمكتبات المطلوبة ...


// ... باقي الأكواد ...

// تغيير كلمة سر أي موظف (بواسطة الأدمن)
router.post('/changepass', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { userid, newpass } = req.body;
  if (!userid || !newpass) return res.json({msg: "بيانات ناقصة"});
  if (newpass.length < 8) return res.json({msg: "كلمة المرور ضعيفة!"});
  const hash = await bcrypt.hash(newpass, 10);
  await User.findByIdAndUpdate(userid, { password: hash });
  res.json({msg: "تم تغيير كلمة المرور!"});
});

// تغيير كلمة سر الأدمن نفسه
router.post('/selfpass', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { oldpass, newpass } = req.body;
  if (!oldpass || !newpass) return res.json({msg: "بيانات ناقصة"});
  const u = await User.findById(req.user.id);
  if (!u) return res.sendStatus(404);
  const valid = await bcrypt.compare(oldpass, u.password);
  if (!valid) return res.json({msg:"كلمة المرور الحالية غير صحيحة!"});
  if (newpass.length < 8) return res.json({msg: "كلمة المرور ضعيفة!"});
  const hash = await bcrypt.hash(newpass, 10);
  u.password = hash; await u.save();
  res.json({msg:"تم تغيير كلمة المرور!"});
});

export default router;
