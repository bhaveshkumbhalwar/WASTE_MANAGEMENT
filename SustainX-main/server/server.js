require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Trigger Restart: 2026-04-18T16:42:00Z
const path = require('path');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const statsRoutes = require('./routes/statsRoutes');
const storeRoutes = require('./routes/storeRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler (includes multer errors)
app.use((err, req, res, next) => {
  // Multer file-size / file-type errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Image too large. Maximum size is 2 MB.' });
  }
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ message: err.message });
  }

  console.error(err.stack);
  res.status(500).json({ 
    message: `Internal server error: ${err.message}`,
    error: err.name
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
