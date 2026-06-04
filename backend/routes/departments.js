// departments.js
const router = require('express').Router();
const { pool, logActivity } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT d.*, COUNT(DISTINCT a.asset_id) as asset_count, COUNT(DISTINCT u.user_id) as user_count
      FROM departments d
      LEFT JOIN assets a ON d.department_id = a.department_id
      LEFT JOIN users u ON d.department_id = u.department_id
      GROUP BY d.department_id ORDER BY d.department_name`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { department_name, description, manager, manager_email, manager_contact, status } = req.body;
  if (!department_name) return res.status(400).json({ success: false, message: 'Department name is required.' });
  try {
    const [dup] = await pool.execute('SELECT department_id FROM departments WHERE department_name=?', [department_name]);
    if (dup.length) return res.status(400).json({ success: false, message: 'Department name already exists.' });
    await pool.execute(
      'INSERT INTO departments (department_name,description,manager,manager_email,manager_contact,status) VALUES (?,?,?,?,?,?)',
      [department_name, description, manager, manager_email, manager_contact, status || 'Active']
    );
    await logActivity(req.session.userId, 'CREATE', 'departments', `Created department: ${department_name}`);
    res.json({ success: true, message: 'Department created successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { department_name, description, manager, manager_email, manager_contact, status } = req.body;
  try {
    const [dup] = await pool.execute(
      'SELECT department_id FROM departments WHERE department_name=? AND department_id!=?',
      [department_name, req.params.id]
    );
    if (dup.length) return res.status(400).json({ success: false, message: 'Department name already exists.' });
    await pool.execute(
      'UPDATE departments SET department_name=?,description=?,manager=?,manager_email=?,manager_contact=?,status=? WHERE department_id=?',
      [department_name, description, manager, manager_email, manager_contact, status, req.params.id]
    );
    await logActivity(req.session.userId, 'UPDATE', 'departments', `Updated department: ${department_name}`);
    res.json({ success: true, message: 'Department updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [assets] = await pool.execute('SELECT COUNT(*) as c FROM assets WHERE department_id=?', [req.params.id]);
    const [users] = await pool.execute('SELECT COUNT(*) as c FROM users WHERE department_id=?', [req.params.id]);
    if (assets[0].c > 0 || users[0].c > 0)
      return res.status(400).json({ success: false, message: `Cannot delete: assigned to ${assets[0].c} asset(s) and ${users[0].c} user(s).` });
    const [rows] = await pool.execute('SELECT department_name FROM departments WHERE department_id=?', [req.params.id]);
    await pool.execute('DELETE FROM departments WHERE department_id=?', [req.params.id]);
    await logActivity(req.session.userId, 'DELETE', 'departments', `Deleted department: ${rows[0].department_name}`);
    res.json({ success: true, message: 'Department deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
