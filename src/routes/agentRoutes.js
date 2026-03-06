const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ── KEY FIX: Resolves EMP-format code or UUID to the correct SQL WHERE clause ─
// Returns { condition, value } where condition is the SQL fragment and
// value is what gets passed as $1 to the query.
function resolveIdCondition(id) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return {
    condition: isUUID ? 'u.id = $1' : 'u.employee_id = $1',
    value: id,
  };
}

// Query params: onboarding_status
// Used by AI tool: get_all_employees, get_employees_by_status
router.get('/employees', authenticate, async (req, res, next) => {
  try {
    const { onboarding_status } = req.query;

    const conditions = [`u.role = 'employee'`, `u.is_active = true`];
    const values     = [];

    if (onboarding_status) {
      values.push(onboarding_status);
      conditions.push(`u.onboarding_status = $${values.length}`);
    }

    const result = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.employee_id,
         u.position,
         u.start_date,
         u.onboarding_status,
         u.phone,
         d.name  AS department_name,
         m.name  AS manager_name
       FROM   users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN users       m ON m.id = u.manager_id
       WHERE  ${conditions.join(' AND ')}
       ORDER BY u.created_at DESC`,
      values
    );

    res.status(200).json({
      status:  'success',
      results: result.rows.length,
      data:    result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/agent/employees/:id
// Used by AI tool: get_employee_by_id
// FIXED: accepts both UUID and EMP-format code (e.g. EMP2602521)
router.get('/employees/:id', authenticate, async (req, res, next) => {
  try {
    // STEP 1: Detect if it's a UUID or EMP code, build the right WHERE clause
    const { condition, value } = resolveIdCondition(req.params.id);

    // STEP 2: Run query using the resolved condition
    const result = await pool.query(
      `SELECT
         u.id, u.name, u.email, u.employee_id, u.position,
         u.start_date, u.onboarding_status, u.phone,
         u.emergency_contact_name, u.emergency_contact_phone,
         d.name AS department_name,
         m.name AS manager_name
       FROM   users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN users       m ON m.id = u.manager_id
       WHERE  ${condition} AND u.is_active = true`,
      [value]
    );

    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Employee not found' });
    }

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/agent/employees/:id/progress
// Used by AI tool: get_employee_progress
// FIXED: accepts both UUID and EMP-format code
router.get('/employees/:id/progress', authenticate, async (req, res, next) => {
  try {
    // STEP 1: Resolve UUID or EMP code
    const { condition, value } = resolveIdCondition(req.params.id);

    // STEP 2: Query progress using resolved condition
    const result = await pool.query(
      `SELECT
         u.id            AS employee_id,
         u.name,
         u.onboarding_status,
         COUNT(et.id)                                                 AS total_tasks,
         COUNT(et.id) FILTER (WHERE et.status = 'completed')         AS completed_tasks,
         COALESCE(
           ROUND(
             COUNT(et.id) FILTER (WHERE et.status = 'completed')::numeric
             / NULLIF(COUNT(et.id), 0) * 100
           ), 0
         )                                                            AS percent
       FROM   users u
       LEFT JOIN employee_tasks et ON et.employee_id = u.id
       WHERE  ${condition}
       GROUP BY u.id, u.name, u.onboarding_status`,
      [value]
    );

    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Employee not found' });
    }

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Query params: status
// Used by AI tool: get_employee_tasks
// FIXED: accepts both UUID and EMP-format code
router.get('/employees/:id/tasks', authenticate, async (req, res, next) => {
  try {
    // STEP 1: Resolve UUID or EMP code
    const { condition, value } = resolveIdCondition(req.params.id);

    const { status } = req.query;
    const values     = [value];

    // Replace the hardcoded et.employee_id = $1 with resolved condition
    // We need to join through users table to support employee_id code lookup
    const statusSQL = status
      ? (values.push(status), `AND et.status = $${values.length}`)
      : '';

    // STEP 2: Join through users to support both UUID and EMP code lookup
    const result = await pool.query(
      `SELECT
         et.id,
         et.status,
         et.due_date,
         et.completed_date,
         et.notes,
         t.id             AS task_id,
         t.title,
         t.description,
         t.task_type,
         t.is_required,
         t.estimated_time,
         t.order_index
       FROM   users u
       JOIN   employee_tasks et ON et.employee_id = u.id
       JOIN   tasks t ON t.id = et.task_id
       WHERE  ${condition} ${statusSQL}
       ORDER  BY t.order_index ASC`,
      values
    );

    res.status(200).json({
      status:  'success',
      results: result.rows.length,
      data:    result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Query params: employee_id, status
// Used by AI tool: get_employee_documents
router.get('/documents', authenticate, async (req, res, next) => {
  try {
    const { employee_id, status } = req.query;
    const conditions = [];
    const values     = [];

    if (employee_id) {
      values.push(employee_id);
      conditions.push(`d.employee_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`d.status = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         d.id, d.original_filename, d.file_type, d.file_size,
         d.status, d.rejection_reason, d.uploaded_date,
         t.title  AS task_title,
         u.name   AS reviewer_name
       FROM   documents d
       LEFT JOIN tasks t ON t.id = d.task_id
       LEFT JOIN users u ON u.id = d.reviewed_by
       ${where}
       ORDER BY d.uploaded_date DESC`,
      values
    );

    res.status(200).json({
      status:  'success',
      results: result.rows.length,
      data:    result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Body: { user_id, title, message, type }
// Used by AI tool: send_reminder
router.post('/notifications/send', authenticate, async (req, res, next) => {
  try {
    const { user_id, title, message, type = 'task_reminder' } = req.body;

    if (!user_id || !message) {
      return res.status(400).json({
        status:  'error',
        message: 'user_id and message are required',
      });
    }

    // 1. Verify employee exists
    const empCheck = await pool.query(
      `SELECT id, name, email FROM users WHERE id = $1 AND is_active = true`,
      [user_id]
    );
    if (!empCheck.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Employee not found' });
    }

    // 2. Insert into notifications table
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [user_id, title || 'Onboarding Reminder', message, type]
    );

    // 3. Log to activity_logs
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'reminder_sent', 'notification', $2, $3)`,
      [
        req.user.id,
        result.rows[0].id,
        JSON.stringify({ sent_to: user_id, message }),
      ]
    );

    // 4. TODO: Send actual email here
    // const { sendEmail } = require('../config/email');
    // await sendEmail({
    //   to:      empCheck.rows[0].email,
    //   subject: title || 'Onboarding Reminder',
    //   text:    message,
    // });

    res.status(201).json({
      status:  'success',
      message: 'Reminder sent successfully',
      data: {
        id:            result.rows[0].id,
        sent_to_name:  empCheck.rows[0].name,
        sent_to_email: empCheck.rows[0].email,
        created_at:    result.rows[0].created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/agent/analytics/overview
// Used by AI tool: get_company_analytics
router.get('/analytics/overview', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)                                                          AS total_employees,
         COUNT(*) FILTER (WHERE onboarding_status = 'completed')          AS completed,
         COUNT(*) FILTER (WHERE onboarding_status = 'in_progress')        AS in_progress,
         COUNT(*) FILTER (WHERE onboarding_status = 'not_started')        AS not_started,
         COUNT(*) FILTER (WHERE onboarding_status = 'overdue')            AS overdue,
         COALESCE(ROUND(AVG(
           (SELECT
              COALESCE(
                COUNT(*) FILTER (WHERE et.status = 'completed') * 100.0
                / NULLIF(COUNT(*), 0), 0
              )
            FROM employee_tasks et
            WHERE et.employee_id = u.id)
         )), 0)                                                            AS avg_progress_percent
       FROM users u
       WHERE u.role = 'employee' AND u.is_active = true`
    );

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/agent/analytics/departments
// Used by AI tool: get_department_analytics
router.get('/analytics/departments', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         d.name                                                              AS department_name,
         COUNT(u.id)                                                         AS headcount,
         COUNT(u.id) FILTER (WHERE u.onboarding_status = 'completed')       AS completed_count,
         COALESCE(ROUND(AVG(
           (SELECT
              COALESCE(
                COUNT(*) FILTER (WHERE et.status = 'completed') * 100.0
                / NULLIF(COUNT(*), 0), 0
              )
            FROM employee_tasks et
            WHERE et.employee_id = u.id)
         )), 0)                                                              AS avg_progress
       FROM   departments d
       LEFT JOIN users u
              ON u.department_id = d.id
             AND u.role = 'employee'
             AND u.is_active = true
       GROUP  BY d.id, d.name
       ORDER  BY d.name`
    );

    res.status(200).json({
      status:  'success',
      results: result.rows.length,
      data:    result.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;