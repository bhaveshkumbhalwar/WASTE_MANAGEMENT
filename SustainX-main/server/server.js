require('dotenv').config();

const express = require('express');
const cors = require('cors');
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
const iotRoutes = require('./routes/iotRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// ✅ Connect to MongoDB
connectDB();

// ✅ CORS FIX (IMPORTANT)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173",
  "https://sustainx-frontend-7xw0.onrender.com"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// ✅ Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/notifications', notificationRoutes);

// ✅ Root route (Render health check)
app.get('/', (req, res) => {
  res.send('🚀 SustainX Backend Running Successfully');
});

// ✅ API check
app.get('/api', (req, res) => {
  res.send('🚀 SustainX API is running successfully...');
});

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: 'Image too large. Maximum size is 2 MB.'
    });
  }

  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({
      message: err.message
    });
  }

  console.error("🔥 Error:", err.stack);

  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message
  });
});

// ✅ Start server (Render compatible)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});