module.exports = {
    // User roles
    ROLES: {
      ADMIN: 'admin',
      HR: 'hr',
      EMPLOYEE: 'employee',
    },
    
    // Task statuses
    TASK_STATUS: {
      PENDING: 'pending',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      OVERDUE: 'overdue',
    },
    
    // Task types
    TASK_TYPES: {
      UPLOAD: 'upload',
      READ: 'read',
      WATCH: 'watch',
      MEETING: 'meeting',
      FORM: 'form',
      TRAINING: 'training',
    },
    
    // Document statuses
    DOCUMENT_STATUS: {
      PENDING: 'pending',
      APPROVED: 'approved',
      REJECTED: 'rejected',
    },
    
    // Onboarding statuses
    ONBOARDING_STATUS: {
      NOT_STARTED: 'not_started',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      OVERDUE: 'overdue',
    },
    
    // Notification types
    NOTIFICATION_TYPES: {
      TASK_ASSIGNED: 'task_assigned',
      TASK_REMINDER: 'task_reminder',
      TASK_COMPLETED: 'task_completed',
      DOCUMENT_UPLOADED: 'document_uploaded',
      DOCUMENT_APPROVED: 'document_approved',
      DOCUMENT_REJECTED: 'document_rejected',
      SYSTEM: 'system',
    },
    
    // File types
    ALLOWED_FILE_TYPES: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    
    // Pagination
    PAGINATION: {
      DEFAULT_PAGE: 1,
      DEFAULT_LIMIT: 10,
      MAX_LIMIT: 100,
    },
    
    // Email templates
    EMAIL_SUBJECTS: {
      WELCOME: 'Welcome to OnboardPro',
      TASK_ASSIGNED: 'New Task Assigned',
      TASK_REMINDER: 'Task Reminder',
      PASSWORD_RESET: 'Password Reset Request',
      DOCUMENT_APPROVED: 'Document Approved',
      DOCUMENT_REJECTED: 'Document Rejected',
    },
  };
  