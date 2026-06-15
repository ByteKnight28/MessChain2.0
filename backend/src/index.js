require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const staffRoutes = require('./routes/staff');

// Cron jobs
const { startMidnightJob } = require('./jobs/midnight');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'MessChain Backend' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/staff', staffRoutes);

// Start midnight cron job
startMidnightJob();

// Start server
app.listen(port, () => {
  console.log(`MessChain backend running on port ${port}`);
});
