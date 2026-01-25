const express = require('express');
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const documentValidator = require('../validators/documentValidator');
const { uploadSingle } = require('../middleware/fileUpload');
const { uploadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Employee document routes
router.post('/upload', uploadLimiter, uploadSingle('document'), documentValidator.upload, validate, documentController.uploadDocument);
router.get('/my-documents', documentController.getMyDocuments);
router.get('/:id', documentValidator.validateId, validate, documentController.getDocumentById);
router.get('/:id/download', documentValidator.validateId, validate, documentController.downloadDocument);
router.delete('/:id', documentValidator.validateId, validate, documentController.deleteDocument);

module.exports = router;
