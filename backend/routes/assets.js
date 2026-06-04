const router = require('express').Router();
const { pool, logActivity, calculateCurrentValue } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/assets
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.*, d.department_name
      FROM assets a
      LEFT JOIN departments d ON a.department_id = d.department_id
      ORDER BY a.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/assets/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.*, d.department_name
      FROM assets a LEFT JOIN departments d ON a.department_id = d.department_id
      WHERE a.asset_id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/assets
router.post('/', requireAuth, async (req, res) => {
  const {
    asset_name, description, control_number, purchase_date, cost,
    lifetime_years, depreciation_method, status, assigned_to_name,
    assigned_to_email, assigned_to_contact, department_id, asset_location,
    insurance_type, insurance_provider, insurance_start, insurance_end, insurance_details,
  } = req.body;

  // Validation
  const errors = [];
  if (!asset_name) errors.push('Asset name is required.');
  if (!control_number) errors.push('Control number is required.');
  if (!asset_location) errors.push('Asset location is required.');
  if (!purchase_date) errors.push('Purchase date is required.');
  if (!cost || parseFloat(cost) <= 0) errors.push('Cost must be greater than 0.');
  if (!lifetime_years || parseInt(lifetime_years) < 1 || parseInt(lifetime_years) > 50)
    errors.push('Lifetime must be between 1 and 50 years.');
  if (assigned_to_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assigned_to_email))
    errors.push('Invalid email address.');
  if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

  try {
    // Check duplicate control number
    const [dup] = await pool.execute('SELECT asset_id FROM assets WHERE control_number = ?', [control_number]);
    if (dup.length) return res.status(400).json({ success: false, message: 'Control number already exists.' });

    const currentValue = calculateCurrentValue(cost, lifetime_years, purchase_date, depreciation_method);
    await pool.execute(`
      INSERT INTO assets (asset_name, description, control_number, purchase_date, cost, current_value,
        lifetime_years, depreciation_method, status, assigned_to_name, assigned_to_email,
        assigned_to_contact, department_id, asset_location, insurance_type, insurance_provider,
        insurance_start, insurance_end, insurance_details)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [asset_name, description, control_number, purchase_date, cost, currentValue,
       lifetime_years, depreciation_method || 'straight-line', status || 'Active',
       assigned_to_name, assigned_to_email, assigned_to_contact,
       department_id || null, asset_location,
       insurance_type, insurance_provider,
       insurance_start || null, insurance_end || null, insurance_details]
    );
    await logActivity(req.session.userId, 'CREATE', 'assets', `Created asset: ${asset_name}`);
    res.json({ success: true, message: 'Asset created successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/assets/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    asset_name, description, control_number, purchase_date, cost,
    lifetime_years, depreciation_method, status, assigned_to_name,
    assigned_to_email, assigned_to_contact, department_id, asset_location,
    insurance_type, insurance_provider, insurance_start, insurance_end, insurance_details,
  } = req.body;

  const errors = [];
  if (!asset_name) errors.push('Asset name is required.');
  if (!control_number) errors.push('Control number is required.');
  if (!asset_location) errors.push('Asset location is required.');
  if (!cost || parseFloat(cost) <= 0) errors.push('Cost must be greater than 0.');
  if (assigned_to_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assigned_to_email))
    errors.push('Invalid email address.');
  if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

  try {
    const [dup] = await pool.execute(
      'SELECT asset_id FROM assets WHERE control_number = ? AND asset_id != ?',
      [control_number, id]
    );
    if (dup.length) return res.status(400).json({ success: false, message: 'Control number already exists.' });

    const currentValue = calculateCurrentValue(cost, lifetime_years, purchase_date, depreciation_method);
    await pool.execute(`
      UPDATE assets SET asset_name=?, description=?, control_number=?, purchase_date=?, cost=?,
        current_value=?, lifetime_years=?, depreciation_method=?, status=?,
        assigned_to_name=?, assigned_to_email=?, assigned_to_contact=?, department_id=?,
        asset_location=?, insurance_type=?, insurance_provider=?, insurance_start=?,
        insurance_end=?, insurance_details=?, updated_at=NOW()
      WHERE asset_id=?`,
      [asset_name, description, control_number, purchase_date, cost, currentValue,
       lifetime_years, depreciation_method, status,
       assigned_to_name, assigned_to_email, assigned_to_contact, department_id || null,
       asset_location, insurance_type, insurance_provider,
       insurance_start || null, insurance_end || null, insurance_details, id]
    );
    await logActivity(req.session.userId, 'UPDATE', 'assets', `Updated asset: ${asset_name}`);
    res.json({ success: true, message: 'Asset updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/assets/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT asset_name, status FROM assets WHERE asset_id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Asset not found.' });
    if (rows[0].status !== 'Disposed')
      return res.status(400).json({ success: false, message: 'Only Disposed assets can be deleted.' });
    await pool.execute('DELETE FROM assets WHERE asset_id = ?', [req.params.id]);
    await logActivity(req.session.userId, 'DELETE', 'assets', `Deleted asset: ${rows[0].asset_name}`);
    res.json({ success: true, message: 'Asset deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
