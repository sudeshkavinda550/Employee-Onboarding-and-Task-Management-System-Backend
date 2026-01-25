const express = require('express');
const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const taskRoutes = require('./taskRoutes');
const templateRoutes = require('./templateRoutes');
const documentRoutes = require('./documentRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const hrRoutes = require('./hrRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/tasks', taskRoutes);
router.use('/templates', templateRoutes);
router.use('/documents', documentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/hr', hrRoutes);
router.use('/admin', adminRoutes);

module.exports = router;