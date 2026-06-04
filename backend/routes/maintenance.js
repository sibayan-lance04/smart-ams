const router = require('express').Router();
const { pool, logActivity } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT m.*, a.asset_name, a.control_number, a.assigned_to_name,
             DATEDIFF(m.next_due_date, CURDATE()) as days_until_due
      FROM maintenance m
      JOIN assets a ON m.asset_id = a.asset_id
      ORDER BY m.next_due_date ASC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { asset_id, maintenance_date, next_due_date, details, status, cost } = req.body;
  if (!asset_id || !maintenance_date || !next_due_date || !details)
    return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
  if (new Date(next_due_date) <= new Date(maintenance_date))
    return res.status(400).json({ success: false, message: 'Next due date must be after maintenance date.' });

  try {
    const [pending] = await pool.execute(
      "SELECT COUNT(*) as c FROM maintenance WHERE asset_id=? AND status='Pending'", [asset_id]
    );
    if (pending[0].c > 0)
      return res.status(400).json({ success: false, message: 'Asset already has pending maintenance.' });

    await pool.execute(
      'INSERT INTO maintenance (asset_id,maintenance_date,next_due_date,details,status,cost) VALUES (?,?,?,?,?,?)',
      [asset_id, maintenance_date, next_due_date, details, status || 'Pending', cost || 0]
    );

    // Auto-update asset status
    if (status === 'Pending') {
      await pool.execute("UPDATE assets SET status='Under Maintenance' WHERE asset_id=?", [asset_id]);
    } else if (status === 'Completed') {
      const [assetRows] = await pool.execute('SELECT current_value FROM assets WHERE asset_id=?', [asset_id]);
      const newStatus = assetRows[0]?.current_value <= 0 ? 'Depreciated' : 'Active';
      await pool.execute('UPDATE assets SET status=? WHERE asset_id=?', [newStatus, asset_id]);
    }

    const [assetInfo] = await pool.execute('SELECT asset_name FROM assets WHERE asset_id=?', [asset_id]);
    await logActivity(req.session.userId, 'CREATE', 'maintenance', `Scheduled maintenance for: ${assetInfo[0].asset_name}`);
    res.json({ success: true, message: 'Maintenance scheduled successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { asset_id, maintenance_date, next_due_date, details, status, cost } = req.body;
  if (new Date(next_due_date) <= new Date(maintenance_date))
    return res.status(400).json({ success: false, message: 'Next due date must be after maintenance date.' });

  try {
    const [old] = await pool.execute('SELECT status, asset_id FROM maintenance WHERE maintenance_id=?', [req.params.id]);
    const oldStatus = old[0]?.status;

    await pool.execute(
      'UPDATE maintenance SET asset_id=?,maintenance_date=?,next_due_date=?,details=?,status=?,cost=? WHERE maintenance_id=?',
      [asset_id, maintenance_date, next_due_date, details, status, cost || 0, req.params.id]
    );

    // Auto-update asset status on status change
    if (status === 'Pending' && oldStatus !== 'Pending') {
      await pool.execute("UPDATE assets SET status='Under Maintenance' WHERE asset_id=?", [asset_id]);
    } else if (status === 'Completed' && oldStatus !== 'Completed') {
      const [assetRows] = await pool.execute('SELECT current_value FROM assets WHERE asset_id=?', [asset_id]);
      const newStatus = assetRows[0]?.current_value <= 0 ? 'Depreciated' : 'Active';
      await pool.execute('UPDATE assets SET status=? WHERE asset_id=?', [newStatus, asset_id]);
    }

    const [assetInfo] = await pool.execute('SELECT asset_name FROM assets WHERE asset_id=?', [asset_id]);
    await logActivity(req.session.userId, 'UPDATE', 'maintenance', `Updated maintenance for: ${assetInfo[0].asset_name}`);
    res.json({ success: true, message: 'Maintenance updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT m.*, a.asset_name FROM maintenance m JOIN assets a ON m.asset_id=a.asset_id
      WHERE m.maintenance_id=?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Record not found.' });
    await pool.execute('DELETE FROM maintenance WHERE maintenance_id=?', [req.params.id]);
    if (rows[0].status === 'Pending') {
      await pool.execute("UPDATE assets SET status='Active' WHERE asset_id=?", [rows[0].asset_id]);
    }
    await logActivity(req.session.userId, 'DELETE', 'maintenance', `Deleted maintenance for: ${rows[0].asset_name}`);
    res.json({ success: true, message: 'Maintenance deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
