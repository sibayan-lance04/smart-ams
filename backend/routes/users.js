const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool, logActivity } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/users
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT u.user_id, u.full_name, u.username, u.role, u.department_id,
             u.created_at, u.updated_at, d.department_name
      FROM users u LEFT JOIN departments d ON u.department_id = d.department_id
      ORDER BY u.created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users
router.post('/', requireAuth, async (req, res) => {
  const { full_name, username, password, confirm_password, department_id } = req.body;
  if (!full_name || !username || !password)
    return res.status(400).json({ success: false, message: 'Full name, username, and password are required.' });
  if (password !== confirm_password)
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  if (username.length < 3)
    return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });

  try {
    const [dup] = await pool.execute('SELECT user_id FROM users WHERE username = ?', [username]);
    if (dup.length) return res.status(400).json({ success: false, message: 'Username already exists.' });

    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
      "INSERT INTO users (full_name, username, password, role, department_id) VALUES (?, ?, ?, 'Admin', ?)",
      [full_name, username, hash, department_id || null]
    );
    await logActivity(req.session.userId, 'CREATE', 'users', `Created user: ${full_name} (${username})`);
    res.json({ success: true, message: 'User created successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/profile — update own profile
router.put('/profile', requireAuth, async (req, res) => {
  const { full_name, username, current_password, new_password, confirm_password, department_id } = req.body;
  if (!full_name || !username)
    return res.status(400).json({ success: false, message: 'Full name and username are required.' });

  try {
    const [dup] = await pool.execute(
      'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
      [username, req.session.userId]
    );
    if (dup.length) return res.status(400).json({ success: false, message: 'Username already exists.' });

    if (new_password) {
      if (!current_password) return res.status(400).json({ success: false, message: 'Current password required.' });
      if (new_password !== confirm_password) return res.status(400).json({ success: false, message: 'Passwords do not match.' });
      if (new_password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

      const [rows] = await pool.execute('SELECT password FROM users WHERE user_id = ?', [req.session.userId]);
      if (!(await bcrypt.compare(current_password, rows[0].password)))
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

      const hash = await bcrypt.hash(new_password, 10);
      await pool.execute(
        'UPDATE users SET full_name=?, username=?, password=?, department_id=? WHERE user_id=?',
        [full_name, username, hash, department_id || null, req.session.userId]
      );
    } else {
      await pool.execute(
        'UPDATE users SET full_name=?, username=?, department_id=? WHERE user_id=?',
        [full_name, username, department_id || null, req.session.userId]
      );
    }

    req.session.fullName = full_name;
    req.session.username = username;
    await logActivity(req.session.userId, 'UPDATE', 'users', 'Updated own profile');
    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/profile/me
router.get('/profile/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT u.user_id, u.full_name, u.username, u.role, u.department_id,
             u.created_at, u.updated_at, d.department_name
      FROM users u LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.user_id = ?`, [req.session.userId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/account — delete own account
router.delete('/account', requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password is required.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const userId = req.session.userId;
    const fullName = req.session.fullName;
    const username = req.session.username;

    // Verify password
    const [rows] = await conn.execute('SELECT password FROM users WHERE user_id = ?', [userId]);
    if (!(await bcrypt.compare(password, rows[0].password)))
      throw new Error('Invalid password.');

    // Ensure at least one admin remains
    const [adminCount] = await conn.execute("SELECT COUNT(*) as c FROM users WHERE role='Admin'");
    if (adminCount[0].c <= 1)
      throw new Error('Cannot delete the last admin account.');

    // Unassign assets
    const [assetResult] = await conn.execute(
      "UPDATE assets SET assigned_to_name='Unassigned', assigned_to_email=NULL, assigned_to_contact=NULL WHERE assigned_to_name=?",
      [fullName]
    );

    // Preserve audit trail — convert logs to system entries
    const [logs] = await conn.execute('SELECT * FROM activity_log WHERE user_id = ?', [userId]);
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    for (const log of logs) {
      await conn.execute(
        'INSERT INTO activity_log (user_id, action_type, table_name, description, timestamp) VALUES (0,?,?,?,?)',
        [log.action_type, log.table_name, `SYSTEM: [DELETED USER: ${username}] ${log.description}`, log.timestamp]
      );
    }
    await conn.execute(
      "INSERT INTO activity_log (user_id, action_type, table_name, description) VALUES (0,'DELETE','users',?)",
      [`SYSTEM: Account deleted - ${username} (${fullName}). Assets reassigned: ${assetResult.affectedRows}`]
    );
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    await conn.execute('DELETE FROM users WHERE user_id = ?', [userId]);
    await conn.commit();

    req.session.destroy();
    res.json({ success: true, message: 'Account deleted successfully.', assetsReassigned: assetResult.affectedRows });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/users/check-assets
router.get('/check-assets', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT COUNT(*) as count FROM assets
      WHERE assigned_to_name = (SELECT full_name FROM users WHERE user_id = ?)
      AND status IN ('Active','Under Maintenance')`, [req.session.userId]);
    res.json({ success: true, asset_count: rows[0].count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
