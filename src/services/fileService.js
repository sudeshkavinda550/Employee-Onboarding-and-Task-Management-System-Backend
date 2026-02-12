const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const fileService = {
  /**
   * Delete file with better error handling
   */
  deleteFile: async (filePath) => {
    try {
      const exists = await fileService.fileExists(filePath);
      
      if (!exists) {
        logger.warn(`File not found for deletion: ${filePath}`);
        return { success: true, message: 'File already deleted or does not exist' };
      }
      
      await fs.unlink(filePath);
      logger.info(`File deleted successfully: ${filePath}`);
      return { success: true, message: 'File deleted successfully' };
      
    } catch (error) {
      logger.error('File deletion error:', {
        filePath,
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      
      if (error.code === 'ENOENT') {
        logger.warn('File already deleted (ENOENT)');
        return { success: true, message: 'File already deleted' };
      }
      
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error('Permission denied to delete file');
      }
      
      if (error.code === 'EBUSY') {
        throw new Error('File is currently in use');
      }
      
      throw error;
    }
  },
  
  /**
   * Check if file exists
   */
  fileExists: async (filePath) => {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Get file info
   */
  getFileInfo: async (filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      logger.error('Get file info error:', error);
      throw error;
    }
  },
  
  /**
   * Move file
   */
  moveFile: async (sourcePath, destPath) => {
    try {
      await fs.rename(sourcePath, destPath);
      logger.info(`File moved from ${sourcePath} to ${destPath}`);
    } catch (error) {
      logger.error('File move error:', error);
      throw error;
    }
  },
  
  /**
   * Create directory if not exists
   */
  ensureDirectory: async (dirPath) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error('Directory creation error:', error);
      throw error;
    }
  },
};

module.exports = fileService;