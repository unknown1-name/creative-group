import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import config from './config.js';

import authRoutes from './routes/auth.js';
import messagesRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);

mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.log(err));
