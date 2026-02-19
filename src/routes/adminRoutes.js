const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      status: 'error',
      message: 'Access denied. Admin only.' 
    });
  }
};

router.get('/stats', authenticate, adminOnly, adminController.getStats);
router.get('/dept-stats', authenticate, adminOnly, adminController.getDeptStats);
router.get('/recent-activity', authenticate, adminOnly, adminController.getRecentActivity);
router.get('/system-health', authenticate, adminOnly, adminController.getSystemHealth);

router.get('/hr-accounts', authenticate, adminOnly, adminController.getHRAccounts);
router.post('/hr-accounts', authenticate, adminOnly, adminController.createHRAccount);
router.patch('/hr-accounts/:id/status', authenticate, adminOnly, adminController.updateHRStatus);
router.delete('/hr-accounts/:id', authenticate, adminOnly, adminController.deleteHRAccount);

router.get('/employees', authenticate, adminOnly, adminController.getAllEmployees);
router.get('/templates', authenticate, adminOnly, adminController.getAllTemplates);
router.get('/documents', authenticate, adminOnly, adminController.getAllDocuments);

router.get('/audit-log', authenticate, adminOnly, adminController.getAuditLog);
router.get('/audit-log/export', authenticate, adminOnly, adminController.exportAuditLog);

router.get('/settings', authenticate, adminOnly, adminController.getSettings);
router.put('/settings', authenticate, adminOnly, adminController.saveSettings);

router.post('/danger/resetTemplates', authenticate, adminOnly, adminController.dangerResetTemplates);
router.post('/danger/purgeInactive', authenticate, adminOnly, adminController.dangerPurgeInactive);

module.exports = router;