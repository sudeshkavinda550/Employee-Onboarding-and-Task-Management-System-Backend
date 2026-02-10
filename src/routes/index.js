const express = require('express');
const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const taskRoutes = require('./taskRoutes');
const templateRoutes = require('./templateRoutes');
const documentRoutes = require('./documentRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const hrRoutes = require('./hrRoutes');
const adminRoutes = require('./adminRoutes');
const departmentRoutes = require('./departmentRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/tasks', taskRoutes);
router.use('/templates', templateRoutes);
router.use('/documents', documentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/hr', hrRoutes);
router.use('/admin', adminRoutes);
router.use('/departments', departmentRoutes);

module.exports = router;