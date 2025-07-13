import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { username, password, phonenumber } = req.body;
    if(!/^01[0-9]{9}$/.test(phonenumber)) return res.json({ msg: 'رقم الموبايل غير صحيح أو غير مصري!' });
    if(password.length < 8) return res.json({ msg: 'كلمة المرور ضعيفة!' });

    let exist = await User.findOne({ $or: [{ username }, { phonenumber }] });
    if (exist) return res.json({ msg: 'اسم المستخدم أو الموبايل مستخدم من قبل!' });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hash, phonenumber });
    await user.save();
    res.json({ msg: "success: account created" });
  } catch (e) { res.status(500).json({ msg: "Server error" }); }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.json({ msg: 'بيانات الدخول غير صحيحة!' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ msg: 'بيانات الدخول غير صحيحة!' });
    const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret);
    res.json({ token, user: { username: user.username, phonenumber: user.phonenumber, role: user.role, _id: user._id } });
  } catch (e) { res.status(500).json({ msg: "Server error" }); }
});

export default router;
