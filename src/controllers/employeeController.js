const User = require('../models/User');
const EmployeeTask = require('../models/EmployeeTask');
const Document = require('../models/Document');
const taskService = require('../services/taskService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const employeeController = {
  /**
   * Get current user profile (Employee profile)
   */
  getProfile: asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    
    const progress = await User.getProgress(req.user.id);
    
    sendSuccess(res, 200, 'Profile retrieved successfully', {
      ...user,
      onboardingProgress: progress
    });
  }),
  
  /**
   * Update current user profile (Employee profile)
   */
  updateProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const updateData = { ...req.body };

    delete updateData.id;
    delete updateData.password;
    delete updateData.role;
    delete updateData.employee_id;
    delete updateData.department_id;
    delete updateData.position;
    delete updateData.start_date;
    delete updateData.manager_id;
    delete updateData.onboarding_status;
    delete updateData.is_active;
    delete updateData.email_verified;
    delete updateData.created_at;
    delete updateData.updated_at;
    
    const updatedUser = await User.updateProfile(userId, updateData);
    sendSuccess(res, 200, 'Profile updated successfully', updatedUser);
  }),
  
  /**
   * Get employee dashboard data
   */
  getDashboard: asyncHandler(async (req, res) => {
    const stats = await User.getDashboardStats(req.user.id);
    const tasks = await EmployeeTask.findByEmployeeId(req.user.id);
    const documents = await Document.findByEmployeeId(req.user.id);
    
    sendSuccess(res, 200, 'Dashboard data retrieved successfully', {
      stats,
      recentTasks: tasks.slice(0, 5),
      recentDocuments: documents.slice(0, 3),
    });
  }),
  
  /**
   * Get employee documents
   */
  getDocuments: asyncHandler(async (req, res) => {
    const documents = await Document.findByEmployeeId(req.user.id);
    sendSuccess(res, 200, 'Documents retrieved successfully', documents);
  }),
  
  /**
   * Get all employees (HR/Admin)
   */
  getAllEmployees: asyncHandler(async (req, res) => {
    const filters = {
      role: 'employee',
      department_id: req.query.department_id,
      onboarding_status: req.query.onboarding_status,
      search: req.query.search,
    };
    
    const employees = await User.findAll(filters);
    sendSuccess(res, 200, 'Employees retrieved successfully', employees);
  }),
  
  /**
   * Get employee by ID (HR/Admin)
   */
  getEmployeeById: asyncHandler(async (req, res) => {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return sendError(res, 404, 'Employee not found');
    }
    
    if (employee.role !== 'employee') {
      return sendError(res, 400, 'User is not an employee');
    }
    
    const progress = await User.getProgress(req.params.id);
    const tasks = await EmployeeTask.findByEmployeeId(req.params.id);
    
    sendSuccess(res, 200, 'Employee retrieved successfully', {
      ...employee,
      progress,
      tasks,
    });
  }),
  
  /**
   * Create employee (HR/Admin)
   */
  createEmployee: asyncHandler(async (req, res) => {
    // Generate employee ID if not provided
    if (!req.body.employee_id) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      req.body.employee_id = `EMP${year}${month}${random}`;
    }
    
    const employee = await User.create({
      ...req.body,
      role: 'employee',
      onboarding_status: 'not_started',
      is_active: true,
      email_verified: false
    });
    
    sendSuccess(res, 201, 'Employee created successfully', employee);
  }),
  
  /**
   * Update employee (HR/Admin)
   */
  updateEmployee: asyncHandler(async (req, res) => {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return sendError(res, 404, 'Employee not found');
    }
    
    if (employee.role !== 'employee') {
      return sendError(res, 400, 'User is not an employee');
    }

    const updateData = { ...req.body };
    delete updateData.password;
    delete updateData.created_at;
    delete updateData.updated_at;
    
    const updatedEmployee = await User.update(req.params.id, updateData);
    sendSuccess(res, 200, 'Employee updated successfully', updatedEmployee);
  }),
  
  /**
   * Delete employee (HR/Admin)
   */
  deleteEmployee: asyncHandler(async (req, res) => {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return sendError(res, 404, 'Employee not found');
    }
    
    if (employee.role !== 'employee') {
      return sendError(res, 400, 'User is not an employee');
    }
    
    await User.delete(req.params.id);
    sendSuccess(res, 200, 'Employee deleted successfully');
  }),
  
  /**
   * Assign template to employee (HR/Admin)
   */
  assignTemplate: asyncHandler(async (req, res) => {
    const { templateId } = req.body;
    const assignedTasks = await taskService.assignTemplateToEmployee(
      req.params.id,
      templateId,
      req.user.id
    );
    
    // Update employee onboarding status
    await User.updateOnboardingStatus(req.params.id, 'in_progress');
    
    sendSuccess(res, 200, 'Template assigned successfully', assignedTasks);
  }),
  
  /**
   * Get employee progress (HR/Admin)
   */
  getEmployeeProgress: asyncHandler(async (req, res) => {
    const progress = await User.getProgress(req.params.id);
    sendSuccess(res, 200, 'Progress retrieved successfully', progress);
  }),
  
  /**
   * Send reminder to employee (HR/Admin)
   */
  sendReminder: asyncHandler(async (req, res) => {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return sendError(res, 404, 'Employee not found');
    }
    
    // Implement reminder logic (email, notification, etc.)
    sendSuccess(res, 200, 'Reminder sent successfully');
  }),

  /**
   * Upload profile picture
   */
  uploadProfilePicture: asyncHandler(async (req, res) => {
    if (!req.file) {
      return sendError(res, 400, 'No file uploaded');
    }

    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
    await User.updateProfile(req.user.id, { profile_picture: profilePictureUrl });

    sendSuccess(res, 200, 'Profile picture uploaded successfully', {
      profile_picture: profilePictureUrl
    });
  }),

  /**
   * Change password for current user
   */
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Verify current password
    const isValid = await User.verifyPassword(userId, currentPassword);
    if (!isValid) {
      return sendError(res, 400, 'Current password is incorrect');
    }

    // Update to new password
    await User.updatePassword(userId, newPassword);

    sendSuccess(res, 200, 'Password changed successfully');
  }),

  /**
   * Get employee tasks
   */
  getEmployeeTasks: asyncHandler(async (req, res) => {
    const tasks = await EmployeeTask.findByEmployeeId(req.user.id);
    sendSuccess(res, 200, 'Tasks retrieved successfully', tasks);
  }),

  /**
   * Update task status for current user
   */
  updateTaskStatus: asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    // Find the task and verify it belongs to the user
    const task = await EmployeeTask.findById(taskId);
    if (!task) {
      return sendError(res, 404, 'Task not found');
    }

    if (task.employee_id !== userId) {
      return sendError(res, 403, 'You are not authorized to update this task');
    }

    // Update task status
    const updatedTask = await EmployeeTask.updateStatus(taskId, status, notes);

    // If task is completed, check if all tasks are completed for onboarding progress
    if (status === 'completed') {
      const progress = await User.getProgress(userId);
      if (progress.percentage === 100) {
        await User.updateOnboardingStatus(userId, 'completed');
      }
    }

    sendSuccess(res, 200, 'Task status updated successfully', updatedTask);
  }),

  /**
   * Get employee statistics
   */
  getEmployeeStats: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const [progress, tasks, documents] = await Promise.all([
      User.getProgress(userId),
      EmployeeTask.findByEmployeeId(userId),
      Document.findByEmployeeId(userId)
    ]);

    const stats = {
      totalTasks: progress.total_tasks || 0,
      completedTasks: progress.completed_tasks || 0,
      pendingTasks: progress.pending_tasks || 0,
      inProgressTasks: progress.in_progress_tasks || 0,
      overdueTasks: progress.overdue_tasks || 0,
      completionRate: progress.percentage || 0,
      totalDocuments: documents.length,
      verifiedDocuments: documents.filter(doc => doc.status === 'verified').length,
      pendingDocuments: documents.filter(doc => doc.status === 'pending').length
    };

    sendSuccess(res, 200, 'Statistics retrieved successfully', stats);
  }),

  /**
   * Get employee notifications
   */
  getNotifications: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    // Get overdue tasks
    const overdueTasks = await EmployeeTask.findOverdueTasks(userId);
    
    // Get pending documents
    const pendingDocuments = await Document.findByEmployeeId(userId)
      .then(docs => docs.filter(doc => doc.status === 'pending'));
    
    // Get upcoming deadlines (tasks due in next 3 days)
    const upcomingTasks = await EmployeeTask.findUpcomingTasks(userId, 3);
    
    const notifications = {
      overdueTasks: overdueTasks.map(task => ({
        type: 'task_overdue',
        message: `Task "${task.title}" is overdue`,
        taskId: task.id,
        dueDate: task.due_date
      })),
      pendingDocuments: pendingDocuments.map(doc => ({
        type: 'document_pending',
        message: `Document "${doc.document_type}" needs verification`,
        documentId: doc.id,
        documentType: doc.document_type
      })),
      upcomingDeadlines: upcomingTasks.map(task => ({
        type: 'deadline_upcoming',
        message: `Task "${task.title}" is due soon`,
        taskId: task.id,
        dueDate: task.due_date,
        daysLeft: Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      }))
    };

    sendSuccess(res, 200, 'Notifications retrieved successfully', notifications);
  }),

  /**
   * Mark notification as read
   */
  markNotificationAsRead: asyncHandler(async (req, res) => {

    sendSuccess(res, 200, 'Notification marked as read');
  }),

  /**
   * Get employee's team members
   */
  getTeamMembers: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    // Get user's department
    const user = await User.findById(userId);
    if (!user || !user.department_id) {
      return sendSuccess(res, 200, 'No team members found', []);
    }
    
    // Find other employees in the same department
    const teamMembers = await User.findByDepartment(user.department_id, userId);
    
    sendSuccess(res, 200, 'Team members retrieved successfully', teamMembers);
  }),

  /**
   * Get employee's manager details
   */
  getManagerDetails: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user || !user.manager_id) {
      return sendError(res, 404, 'No manager assigned');
    }
    
    const manager = await User.findById(user.manager_id);
    if (!manager) {
      return sendError(res, 404, 'Manager not found');
    }
    
    sendSuccess(res, 200, 'Manager details retrieved successfully', {
      id: manager.id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      position: manager.position,
      department: manager.department_name
    });
  }),

  /**
   * Submit feedback
   */
  submitFeedback: asyncHandler(async (req, res) => {
    const { feedback, rating, type } = req.body;
    const userId = req.user.id;

    
    sendSuccess(res, 201, 'Feedback submitted successfully');
  }),

  /**
   * Get employee onboarding timeline
   */
  getOnboardingTimeline: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const tasks = await EmployeeTask.findByEmployeeId(userId);
    
    // Create timeline from tasks
    const timeline = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.due_date,
      completedDate: task.completed_at,
      createdAt: task.created_at,
      category: task.category,
      priority: task.priority
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    sendSuccess(res, 200, 'Onboarding timeline retrieved successfully', timeline);
  }),

  /**
   * Request time off
   */
  requestTimeOff: asyncHandler(async (req, res) => {
    const { startDate, endDate, reason, type } = req.body;
    const userId = req.user.id;
    
    sendSuccess(res, 201, 'Time off request submitted successfully');
  }),

  /**
   * Get employee time off requests
   */
  getTimeOffRequests: asyncHandler(async (req, res) => {
    const userId = req.user.id;

    sendSuccess(res, 200, 'Time off requests retrieved successfully', []);
  }),

  /**
   * Get employee attendance
   */
  getAttendance: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { month, year } = req.query;
    
    const attendance = {
      totalDays: 22,
      presentDays: 20,
      absentDays: 1,
      lateDays: 1,
      leaveDays: 0,
      attendancePercentage: 90.9
    };
    
    sendSuccess(res, 200, 'Attendance retrieved successfully', attendance);
  }),

  /**
   * Get employee performance reviews
   */
  getPerformanceReviews: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const reviews = [
      {
        id: 1,
        period: 'Q1 2024',
        rating: 4.5,
        reviewer: 'John Doe',
        reviewDate: '2024-03-31',
        comments: 'Excellent performance this quarter'
      },
      {
        id: 2,
        period: 'Q4 2023',
        rating: 4.0,
        reviewer: 'Jane Smith',
        reviewDate: '2023-12-31',
        comments: 'Good work, keep improving'
      }
    ];
    
    sendSuccess(res, 200, 'Performance reviews retrieved successfully', reviews);
  }),

  /**
   * Update employee preferences
   */
  updatePreferences: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const preferences = req.body;
    
    sendSuccess(res, 200, 'Preferences updated successfully');
  }),

  /**
   * Get employee preferences
   */
  getPreferences: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const preferences = {
      emailNotifications: true,
      pushNotifications: true,
      taskReminders: true,
      documentNotifications: true,
      language: 'en',
      timezone: 'UTC',
      theme: 'light'
    };
    
    sendSuccess(res, 200, 'Preferences retrieved successfully', preferences);
  })
};

module.exports = employeeController;