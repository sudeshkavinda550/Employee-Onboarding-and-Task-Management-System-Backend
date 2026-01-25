module.exports = {
    // Authentication errors
    AUTH: {
      INVALID_CREDENTIALS: 'Invalid email or password',
      EMAIL_EXISTS: 'Email already registered',
      USER_NOT_FOUND: 'User not found',
      UNAUTHORIZED: 'Unauthorized access',
      TOKEN_INVALID: 'Invalid or expired token',
      TOKEN_MISSING: 'No token provided',
      WEAK_PASSWORD: 'Password does not meet security requirements',
      EMAIL_NOT_VERIFIED: 'Email not verified',
      ACCOUNT_DISABLED: 'Account has been disabled',
    },
    
    // Validation errors
    VALIDATION: {
      REQUIRED_FIELD: 'This field is required',
      INVALID_EMAIL: 'Invalid email address',
      INVALID_PHONE: 'Invalid phone number',
      INVALID_DATE: 'Invalid date format',
      INVALID_UUID: 'Invalid ID format',
      INVALID_FILE_TYPE: 'Invalid file type',
      FILE_TOO_LARGE: 'File size exceeds maximum limit',
    },
    
    // Resource errors
    RESOURCE: {
      NOT_FOUND: 'Resource not found',
      ALREADY_EXISTS: 'Resource already exists',
      CREATION_FAILED: 'Failed to create resource',
      UPDATE_FAILED: 'Failed to update resource',
      DELETE_FAILED: 'Failed to delete resource',
    },
    
    // Permission errors
    PERMISSION: {
      FORBIDDEN: 'You do not have permission to perform this action',
      ROLE_REQUIRED: 'Required role not found',
    },
    
    // Task errors
    TASK: {
      NOT_FOUND: 'Task not found',
      ALREADY_COMPLETED: 'Task already completed',
      CANNOT_UPDATE: 'Cannot update task status',
      DOCUMENT_REQUIRED: 'Document upload required for this task',
    },
    
    // Template errors
    TEMPLATE: {
      NOT_FOUND: 'Template not found',
      NO_TASKS: 'Template must have at least one task',
      IN_USE: 'Template is currently in use and cannot be deleted',
    },
    
    // Document errors
    DOCUMENT: {
      NOT_FOUND: 'Document not found',
      UPLOAD_FAILED: 'Document upload failed',
      INVALID_FORMAT: 'Invalid document format',
      ALREADY_REVIEWED: 'Document already reviewed',
    },
    
    // Server errors
    SERVER: {
      INTERNAL_ERROR: 'Internal server error',
      DATABASE_ERROR: 'Database error occurred',
      SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    },
  };