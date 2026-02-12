const Document = require('../models/Document');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const fileService = require('../services/fileService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');

const documentController = {
  uploadDocument: asyncHandler(async (req, res) => {
    if (!req.file) {
      return sendError(res, 400, 'No file uploaded');
    }
    
    const documentData = {
      employee_id: req.user.id,
      task_id: req.body.task_id || null,
      filename: req.file.filename,
      original_filename: req.file.originalname,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
    };
    
    const document = await Document.create(documentData);
    sendSuccess(res, 201, 'Document uploaded successfully', document);
  }),
  
  getMyDocuments: asyncHandler(async (req, res) => {
    const documents = await Document.findByEmployeeId(req.user.id);
    sendSuccess(res, 200, 'Documents retrieved successfully', documents);
  }),
  
  getDocumentById: asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return sendError(res, 404, 'Document not found');
    }
    
    if (document.employee_id !== req.user.id && 
        !['hr', 'admin'].includes(req.user.role)) {
      return sendError(res, 403, 'Access denied');
    }
    
    sendSuccess(res, 200, 'Document retrieved successfully', document);
  }),
  
  deleteDocument: asyncHandler(async (req, res) => {
    console.log(`[deleteDocument] Starting deletion for ID: ${req.params.id}`);
    console.log(`[deleteDocument] User: ${req.user.id}, Role: ${req.user.role}`);
    
    try {
      const document = await Document.findById(req.params.id);
      console.log(`[deleteDocument] Document found:`, document ? 'Yes' : 'No');
      
      if (!document) {
        console.log(`[deleteDocument] Document not found in database`);
        return sendError(res, 404, 'Document not found');
      }
      
      if (document.employee_id !== req.user.id && 
          !['hr', 'admin'].includes(req.user.role)) {
        console.log(`[deleteDocument] Permission denied`);
        return sendError(res, 403, 'Access denied - You do not have permission to delete this document');
      }
      
      console.log(`[deleteDocument] Permission granted, proceeding with deletion`);
      
      const taskId = document.task_id;
      const employeeId = document.employee_id;
      
      if (document.file_path) {
        try {
          console.log(`[deleteDocument] Checking file existence: ${document.file_path}`);
          const fileExists = await fileService.fileExists(document.file_path);
          
          if (fileExists) {
            console.log(`[deleteDocument] File exists, deleting...`);
            await fileService.deleteFile(document.file_path);
            console.log(`[deleteDocument] Physical file deleted successfully`);
          } else {
            console.log(`[deleteDocument] Physical file not found (already deleted or moved)`);
          }
        } catch (fileError) {
          console.error('[deleteDocument] File deletion error (continuing anyway):', fileError.message);
        }
      }
      
      console.log(`[deleteDocument] Deleting from database...`);
      const deletedDoc = await Document.delete(req.params.id);
      console.log(`[deleteDocument] Database deletion successful`);
      
      if (taskId && employeeId) {
        console.log(`[deleteDocument] Document was associated with employee_task: ${taskId}`);
        
        try {
          const remainingDocs = await query(
            `SELECT COUNT(*) as count 
             FROM documents 
             WHERE task_id = $1 AND employee_id = $2`,
            [taskId, employeeId]
          );
          
          const remainingCount = parseInt(remainingDocs.rows[0].count);
          console.log(`[deleteDocument] Remaining documents for this employee_task: ${remainingCount}`);
          
          if (remainingCount === 0) {
            console.log(`[deleteDocument] No documents remain, updating employee_task status to pending`);
            
            const updateResult = await query(
              `UPDATE employee_tasks 
               SET status = 'pending', 
                   updated_at = CURRENT_TIMESTAMP 
               WHERE id = $1 AND employee_id = $2
               RETURNING *`,
              [taskId, employeeId]
            );
            
            if (updateResult.rows.length > 0) {
              console.log(`[deleteDocument] Employee task status updated successfully:`, updateResult.rows[0]);
            } else {
              console.log(`[deleteDocument] Employee task not found or already updated`);
            }
          } else {
            console.log(`[deleteDocument] ${remainingCount} document(s) still remain, keeping task as completed`);
          }
        } catch (taskUpdateError) {
          console.error('[deleteDocument] Error updating task status:', taskUpdateError);
        }
      } else {
        console.log(`[deleteDocument] Document not associated with any task`);
      }
      
      return sendSuccess(res, 200, 'Document deleted successfully', deletedDoc);
      
    } catch (error) {
      console.error('[deleteDocument] Critical error:', error);
      console.error('[deleteDocument] Error stack:', error.stack);
      
      if (error.message === 'Document not found') {
        return sendError(res, 404, 'Document not found');
      }
      
      return sendError(res, 500, `Failed to delete document: ${error.message}`);
    }
  }),
  
  downloadDocument: asyncHandler(async (req, res) => {
    console.log(`[downloadDocument] Starting download for ID: ${req.params.id}`);
    
    try {
      const document = await Document.findById(req.params.id);
      console.log(`[downloadDocument] Document found:`, document ? 'Yes' : 'No');
      
      if (!document) {
        console.log(`[downloadDocument] Document not found in database`);
        return sendError(res, 404, 'Document not found in database');
      }
      
      if (document.employee_id !== req.user.id && 
          !['hr', 'admin'].includes(req.user.role)) {
        console.log(`[downloadDocument] Access denied`);
        return sendError(res, 403, 'Access denied');
      }
      
      if (!document.file_path) {
        console.log(`[downloadDocument] No file_path in document record`);
        return sendError(res, 404, 'Document file path not found');
      }
      
      console.log(`[downloadDocument] File path: ${document.file_path}`);
      
      const fileExists = await fileService.fileExists(document.file_path);
      console.log(`[downloadDocument] File exists on disk:`, fileExists);
      
      if (!fileExists) {
        console.error(`[downloadDocument] File not found on disk: ${document.file_path}`);
        return sendError(res, 404, 'Document file not found on server');
      }
      
      console.log(`[downloadDocument] Sending file...`);
      
      res.download(document.file_path, document.original_filename, (err) => {
        if (err) {
          console.error('[downloadDocument] Download stream error:', err);
          if (!res.headersSent) {
            return sendError(res, 500, 'Error downloading document');
          }
        } else {
          console.log(`[downloadDocument] File sent successfully`);
        }
      });
      
    } catch (error) {
      console.error('[downloadDocument] Critical error:', error);
      
      if (!res.headersSent) {
        return sendError(res, 500, error.message || 'Failed to download document');
      }
    }
  }),
  
  getAllDocuments: asyncHandler(async (req, res) => {
    const filters = {
      status: req.query.status,
      employee_id: req.query.employee_id,
    };
    
    const documents = await Document.findAll(filters);
    sendSuccess(res, 200, 'Documents retrieved successfully', documents);
  }),
  
  approveDocument: asyncHandler(async (req, res) => {
    const document = await Document.approve(req.params.id, req.user.id);
    
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
  
  rejectDocument: asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const document = await Document.reject(req.params.id, req.user.id, reason);
    
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
  
  getPendingDocuments: asyncHandler(async (req, res) => {
    const documents = await Document.getPending();
    sendSuccess(res, 200, 'Pending documents retrieved successfully', documents);
  }),
};

module.exports = documentController;