const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const fileService = {
  /**
   * Delete file
   */
  deleteFile: async (filePath) => {
    try {
      await fs.unlink(filePath);
      logger.info(`File deleted: ${filePath}`);
    } catch (error) {
      logger.error('File deletion error:', error);
      throw error;
    }
  },
  
  /**
   * Check if file exists
   */
  fileExists: async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
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
