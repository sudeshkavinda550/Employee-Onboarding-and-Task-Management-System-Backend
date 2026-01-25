const Document = require('../models/Document');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const fileService = require('../services/fileService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const documentController = {
  /**
   * Upload document
   */
  uploadDocument: asyncHandler(async (req, res) => {
    if (!req.file) {
      return sendError(res, 400, 'No file uploaded');
    }
    
    const document = await Document.create({
      employee_id: req.user.id,
      task_id: req.body.task_id || null,
      filename: req.file.filename,
      original_filename: req.file.originalname,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
    });
    
    sendSuccess(res, 201, 'Document uploaded successfully', document);
  }),
  
  /**
   * Get current user's documents
   */
  getMyDocuments: asyncHandler(async (req, res) => {
    const documents = await Document.findByEmployeeId(req.user.id);
    sendSuccess(res, 200, 'Documents retrieved successfully', documents);
  }),
  
  /**
   * Get document by ID
   */
  getDocumentById: asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return sendError(res, 404, 'Document not found');
    }
    
    // Check if user owns the document or is HR/Admin
    if (document.employee_id !== req.user.id && 
        !['hr', 'admin'].includes(req.user.role)) {
      return sendError(res, 403, 'Access denied');
    }
    
    sendSuccess(res, 200, 'Document retrieved successfully', document);
  }),
  
  /**
   * Delete document
   */
  deleteDocument: asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return sendError(res, 404, 'Document not found');
    }
    
    // Check if user owns the document
    if (document.employee_id !== req.user.id && 
        !['hr', 'admin'].includes(req.user.role)) {
      return sendError(res, 403, 'Access denied');
    }
    
    // Delete file from storage
    await fileService.deleteFile(document.file_path);
    
    // Delete from database
    await Document.delete(req.params.id);
    
    sendSuccess(res, 200, 'Document deleted successfully');
  }),
  
  /**
   * Download document
   */
  downloadDocument: asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return sendError(res, 404, 'Document not found');
    }
    
    // Check if user owns the document or is HR/Admin
    if (document.employee_id !== req.user.id && 
        !['hr', 'admin'].includes(req.user.role)) {
      return sendError(res, 403, 'Access denied');
    }
    
    // Check if file exists
    const fileExists = await fileService.fileExists(document.file_path);
    if (!fileExists) {
      return sendError(res, 404, 'File not found');
    }
    
    res.download(document.file_path, document.original_filename);
  }),
  
  /**
   * Get all documents (HR/Admin)
   */
  getAllDocuments: asyncHandler(async (req, res) => {
    const filters = {
      status: req.query.status,
      employee_id: req.query.employee_id,
    };
    
    const documents = await Document.findAll(filters);
    sendSuccess(res, 200, 'Documents retrieved successfully', documents);
  }),
  
  /**
   * Approve document (HR/Admin)
   */
  approveDocument: asyncHandler(async (req, res) => {
    const document = await Document.approve(req.params.id, req.user.id);
    
    // Send notification and email
    await notificationService.sendDocumentApprovedNotification(
      document.employee_id,
      document.original_filename
    );
    
    const User = require('../models/User');
    const employee = await User.findById(document.employee_id);
    await emailService.sendDocumentApprovedEmail(
      employee.email,
      employee.name,
      document.original_filename
    );
    
    sendSuccess(res, 200, 'Document approved successfully', document);
  }),
  
  /**
   * Reject document (HR/Admin)
   */
  rejectDocument: asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const document = await Document.reject(req.params.id, req.user.id, reason);
    
    // Send notification and email
    await notificationService.sendDocumentRejectedNotification(
      document.employee_id,
      document.original_filename
    );
    
    const User = require('../models/User');
    const employee = await User.findById(document.employee_id);
    await emailService.sendDocumentRejectedEmail(
      employee.email,
      employee.name,
      document.original_filename,
      reason
    );
    
    sendSuccess(res, 200, 'Document rejected successfully', document);
  }),
  
  /**
   * Get pending documents (HR/Admin)
   */
  getPendingDocuments: asyncHandler(async (req, res) => {
    const documents = await Document.getPending();
    sendSuccess(res, 200, 'Pending documents retrieved successfully', documents);
  }),
};

module.exports = documentController;