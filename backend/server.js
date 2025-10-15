require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const jobseekerRoutes = require('./routes/jobseekerRoutes');
const employerRoutes = require('./routes/employerRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { getInstance: getMLServiceManager } = require('./services/ml/MLServiceManager');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Initialize ML Service Manager (auto-starts Python services)
const mlServiceManager = getMLServiceManager();
let mlServicesEnabled = false;

// Start ML services if enabled
if (process.env.ENABLE_ML_SERVICES !== 'false') {
  mlServiceManager.startAll()
    .then((success) => {
      mlServicesEnabled = success;
    })
    .catch((error) => {
      // ML services failed to start, running in basic mode
    });
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files for uploads with proper headers
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    } else if (path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache images for 1 year
    }
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobseekers', jobseekerRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/admin', adminRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).send('Server Error');
});

// ML Service status endpoint
app.get('/api/ml-services/status', (req, res) => {
  const status = mlServiceManager.getStatus();
  res.json({
    enabled: mlServicesEnabled,
    services: status,
    ready: mlServiceManager.isReady()
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await mlServiceManager.stopAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await mlServiceManager.stopAll();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔗 API available at http://localhost:${PORT}`);
  if (process.env.ENABLE_ML_SERVICES !== 'false') {
    console.log('⏳ ML services are starting in the background...');
  }
});