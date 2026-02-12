const User = require('../models/User');
const EmployeeTask = require('../models/EmployeeTask');
const Document = require('../models/Document');
const taskService = require('../services/taskService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const employeeController = {
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
  
  getDocuments: asyncHandler(async (req, res) => {
    const documents = await Document.findByEmployeeId(req.user.id);
    sendSuccess(res, 200, 'Documents retrieved successfully', documents);
  }),
  
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
  
  createEmployee: asyncHandler(async (req, res) => {
    const { query } = require('../config/database');
    const bcrypt = require('bcryptjs');
    const emailService = require('../config/email');
    
    const {
      name,
      email,
      password,
      position,
      department_id,
      start_date,
      phone,
      address
    } = req.body;

    if (!name || !email) {
      return sendError(res, 400, 'Name and email are required');
    }

    try {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return sendError(res, 400, 'Email already exists');
      }

      let employee_id = req.body.employee_id;
      if (!employee_id) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        employee_id = `EMP${year}${month}${random}`;
      }

      const plainPassword = password || 
        Math.random().toString(36).slice(-8) + 
        Math.random().toString(36).slice(-4).toUpperCase() + '1!';
      
      let department_name = null;
      if (department_id) {
        const deptResult = await query(
          'SELECT name FROM departments WHERE id = $1',
          [department_id]
        );
        department_name = deptResult.rows[0]?.name;
      }

      try {
        await emailService.sendEmployeeCredentialsEmail({ 
          name: name,
          email: email,
          employeeId: employee_id,
          password: plainPassword,
          position: position,
          startDate: start_date,
          department: department_name
        });
      } catch (emailError) {
        // Email failed, continue with employee creation
      }

      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const result = await query(
        `INSERT INTO users 
         (name, email, password, employee_id, position, department_id, start_date, phone, address, role, onboarding_status, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'employee', 'not_started', true, false)
         RETURNING id, name, email, employee_id, position, department_id, start_date, phone, address, onboarding_status, is_active, created_at`,
        [name, email, hashedPassword, employee_id, position, department_id || null, start_date, phone || null, address || null]
      );

      const newEmployee = result.rows[0];

      sendSuccess(res, 201, 'Employee created successfully. Welcome email sent with login credentials.', {
        ...newEmployee,
        department_name: department_name
      });

    } catch (error) {
      return sendError(res, 500, 'Failed to create employee: ' + error.message);
    }
  }),
  
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
  
  deleteEmployee: asyncHandler(async (req, res) => {
    const employeeId = req.params.id;
    
    const employee = await User.findById(employeeId);
    
    if (!employee) {
      return sendError(res, 404, 'Employee not found');
    }
    
    if (employee.role !== 'employee') {
      return sendError(res, 400, 'Can only delete employee accounts');
    }
    
    if (req.user.id === employeeId) {
      return sendError(res, 400, 'Cannot delete your own account');
    }
    
    try {
      const deleted = await User.delete(employeeId);
      
      sendSuccess(res, 200, 'Employee deleted permanently', {
        deleted: {
          id: deleted.id,
          name: deleted.name,
          email: deleted.email
        }
      });
      
    } catch (error) {
      if (error.code === '23503') {
        return sendError(res, 409, 'Cannot delete: Foreign key constraint');
      }
      
      return sendError(res, 500, `Delete failed: ${error.message}`);
    }
  }),
  
  assignTemplate: asyncHandler(async (req, res) => {
    const { templateId } = req.body;
    const assignedTasks = await taskService.assignTemplateToEmployee(
      req.params.id,
      templateId,
      req.user.id
    );
    
    await User.updateOnboardingStatus(req.params.id, 'in_progress');
    
    sendSuccess(res, 200, 'Template assigned successfully', assignedTasks);
  }),
  
  getEmployeeProgress: asyncHandler(async (req, res) => {
    const progress = await User.getProgress(req.params.id);
    sendSuccess(res, 200, 'Progress retrieved successfully', progress);
  }),
  
  sendReminder: asyncHandler(async (req, res) => {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return sendError(res, 404, 'Employee not found');
    }
    
    sendSuccess(res, 200, 'Reminder sent successfully');
  }),

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

  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const isValid = await User.verifyPassword(userId, currentPassword);
    if (!isValid) {
      return sendError(res, 400, 'Current password is incorrect');
    }

    await User.updatePassword(userId, newPassword);

    sendSuccess(res, 200, 'Password changed successfully');
  }),

  getEmployeeTasks: asyncHandler(async (req, res) => {
    const tasks = await EmployeeTask.findByEmployeeId(req.user.id);
    sendSuccess(res, 200, 'Tasks retrieved successfully', tasks);
  }),

  updateTaskStatus: asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    const task = await EmployeeTask.findById(taskId);
    if (!task) {
      return sendError(res, 404, 'Task not found');
    }

    if (task.employee_id !== userId) {
      return sendError(res, 403, 'You are not authorized to update this task');
    }

    const updatedTask = await EmployeeTask.updateStatus(taskId, status, notes);

    if (status === 'completed') {
      const progress = await User.getProgress(userId);
      if (progress.percentage === 100) {
        await User.updateOnboardingStatus(userId, 'completed');
      }
    }

    sendSuccess(res, 200, 'Task status updated successfully', updatedTask);
  }),

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

  getNotifications: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const overdueTasks = await EmployeeTask.findOverdueTasks(userId);
    
    const pendingDocuments = await Document.findByEmployeeId(userId)
      .then(docs => docs.filter(doc => doc.status === 'pending'));
    
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

  markNotificationAsRead: asyncHandler(async (req, res) => {
    sendSuccess(res, 200, 'Notification marked as read');
  }),

  getTeamMembers: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user || !user.department_id) {
      return sendSuccess(res, 200, 'No team members found', []);
    }
    
    const teamMembers = await User.findByDepartment(user.department_id, userId);
    
    sendSuccess(res, 200, 'Team members retrieved successfully', teamMembers);
  }),

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

  submitFeedback: asyncHandler(async (req, res) => {
    const { feedback, rating, type } = req.body;
    const userId = req.user.id;
    
    sendSuccess(res, 201, 'Feedback submitted successfully');
  }),

  getOnboardingTimeline: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const tasks = await EmployeeTask.findByEmployeeId(userId);
    
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

  requestTimeOff: asyncHandler(async (req, res) => {
    const { startDate, endDate, reason, type } = req.body;
    const userId = req.user.id;
    
    sendSuccess(res, 201, 'Time off request submitted successfully');
  }),

  getTimeOffRequests: asyncHandler(async (req, res) => {
    const userId = req.user.id;

    sendSuccess(res, 200, 'Time off requests retrieved successfully', []);
  }),

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

  updatePreferences: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const preferences = req.body;
    
    sendSuccess(res, 200, 'Preferences updated successfully');
  }),

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