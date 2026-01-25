/**
 * Send success response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {object} data - Response data
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
    const response = {
      status: 'success',
      message,
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    res.status(statusCode).json(response);
  };
  
  /**
   * Send error response
   * @param {object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {object} errors - Error details
   */
  const sendError = (res, statusCode = 500, message = 'Error', errors = null) => {
    const response = {
      status: 'error',
      message,
    };
    
    if (errors !== null) {
      response.errors = errors;
    }
    
    res.status(statusCode).json(response);
  };
  
  /**
   * Send paginated response
   * @param {object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Success message
   * @param {object} data - Response data
   * @param {object} pagination - Pagination info
   */
  const sendPaginatedResponse = (res, statusCode = 200, message = 'Success', data = [], pagination = {}) => {
    res.status(statusCode).json({
      status: 'success',
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 0,
      },
    });
  };
  
  module.exports = {
    sendSuccess,
    sendError,
    sendPaginatedResponse,
  };
  