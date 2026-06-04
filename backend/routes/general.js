const router = require('express').Router();
const { pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// Dashboard stats
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [[total]] = await pool.execute("SELECT COUNT(*) as c FROM assets");
    const [[active]] = await pool.execute("SELECT COUNT(*) as c FROM assets WHERE status='Active'");
    const [[deprecated]] = await pool.execute("SELECT COUNT(*) as c FROM assets WHERE status='Depreciated'");
    const [[warranty]] = await pool.execute("SELECT COUNT(*) as c FROM assets WHERE insurance_end >= CURDATE()");
    const [[maintenance]] = await pool.execute("SELECT COUNT(*) as c FROM maintenance WHERE status='Pending' AND next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
    const [[totalVal]] = await pool.execute("SELECT SUM(cost) as total FROM assets WHERE status='Active'");

    const [recentActivity] = await pool.execute(`
      SELECT al.*, CASE WHEN al.user_id=0 THEN 'System' WHEN u.full_name IS NULL THEN 'Deleted User' ELSE u.full_name END as full_name,
             CASE WHEN al.user_id=0 THEN 'system' WHEN u.username IS NULL THEN 'deleted_user' ELSE u.username END as username
      FROM activity_log al LEFT JOIN users u ON al.user_id=u.user_id
      ORDER BY al.timestamp DESC LIMIT 10`);

    const [maintenanceDue] = await pool.execute(`
      SELECT a.asset_name, a.control_number, m.next_due_date, DATEDIFF(m.next_due_date, CURDATE()) as days_until_due
      FROM maintenance m JOIN assets a ON m.asset_id=a.asset_id
      WHERE m.status='Pending' AND m.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY m.next_due_date ASC LIMIT 5`);

    res.json({
      success: true,
      stats: {
        total_assets: total.c, active_assets: active.c, depreciated_assets: deprecated.c,
        under_warranty: warranty.c, maintenance_due: maintenance.c,
        total_value: totalVal.total || 0,
      },
      recent_activities: recentActivity,
      maintenance_due: maintenanceDue,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Activity log
router.get('/activity-log', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT al.*, CASE WHEN al.user_id=0 THEN 'System' WHEN u.full_name IS NULL THEN 'Deleted User' ELSE u.full_name END as full_name,
             CASE WHEN al.user_id=0 THEN 'system' WHEN u.username IS NULL THEN 'deleted_user' ELSE u.username END as username
      FROM activity_log al LEFT JOIN users u ON al.user_id=u.user_id
      ORDER BY al.timestamp DESC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Monitoring dashboard
router.get('/monitoring', requireAuth, async (req, res) => {
  try {
    const [maintenanceDue30] = await pool.execute(`
      SELECT a.asset_id, a.asset_name, a.control_number, a.assigned_to_name, d.department_name,
             m.next_due_date, m.details, m.status, DATEDIFF(m.next_due_date, CURDATE()) as days_until_due
      FROM maintenance m JOIN assets a ON m.asset_id=a.asset_id LEFT JOIN departments d ON a.department_id=d.department_id
      WHERE m.status='Pending' AND m.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY m.next_due_date ASC`);

    const [warrantyExpiring30] = await pool.execute(`
      SELECT a.asset_id, a.asset_name, a.control_number, a.assigned_to_name, d.department_name,
             a.insurance_end, a.insurance_provider, DATEDIFF(a.insurance_end, CURDATE()) as days_until_expires
      FROM assets a LEFT JOIN departments d ON a.department_id=d.department_id
      WHERE a.insurance_end IS NOT NULL AND a.insurance_end >= CURDATE()
      AND a.insurance_end <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY a.insurance_end ASC`);

    const [highlyDepreciated] = await pool.execute(`
      SELECT a.asset_id, a.asset_name, a.control_number, a.cost, a.current_value,
             d.department_name, ROUND(((a.cost-a.current_value)/a.cost)*100,2) as depreciation_percentage
      FROM assets a LEFT JOIN departments d ON a.department_id=d.department_id
      WHERE a.status='Active' AND ((a.cost-a.current_value)/a.cost) >= 0.8
      AND ((a.cost-a.current_value)/a.cost) < 0.9
      ORDER BY depreciation_percentage DESC`);

    const [replacementCandidates] = await pool.execute(`
      SELECT a.asset_id, a.asset_name, a.control_number, a.cost, a.current_value,
             d.department_name, a.status, ROUND(((a.cost-a.current_value)/a.cost)*100,2) as depreciation_percentage
      FROM assets a LEFT JOIN departments d ON a.department_id=d.department_id
      WHERE (a.status='Active' AND ((a.cost-a.current_value)/a.cost) >= 0.9) OR a.status='Depreciated'
      ORDER BY depreciation_percentage DESC`);

    const [[mSummary]] = await pool.execute("SELECT COUNT(*) as c FROM maintenance WHERE status='Pending' AND next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
    const [[wSummary]] = await pool.execute("SELECT COUNT(*) as c FROM assets WHERE insurance_end IS NOT NULL AND insurance_end >= CURDATE() AND insurance_end <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
    const [[hSummary]] = await pool.execute("SELECT COUNT(*) as c FROM assets WHERE status='Active' AND ((cost-current_value)/cost) >= 0.8");
    const [[rSummary]] = await pool.execute("SELECT COUNT(*) as c FROM assets WHERE (status='Active' AND ((cost-current_value)/cost)>=0.9) OR status='Depreciated'");

    res.json({
      success: true,
      summary: { maintenance_due_30: mSummary.c, warranty_expiring_30: wSummary.c, highly_depreciated: hSummary.c, replacement_candidates: rSummary.c },
      maintenance_due_30: maintenanceDue30,
      warranty_expiring_30: warrantyExpiring30,
      depreciated_assets: highlyDepreciated,
      replacement_candidates: replacementCandidates,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reports
router.get('/reports/:type', requireAuth, async (req, res) => {
  try {
    let data = [], title = '';
    const { type } = req.params;

    if (type === 'all_assets') {
      [data] = await pool.execute(`
        SELECT a.*, d.department_name,
          CASE WHEN a.insurance_end >= CURDATE() THEN 'Under Warranty' ELSE 'Warranty Expired' END as warranty_status,
          (a.cost - COALESCE(a.current_value,a.cost)) as total_depreciation,
          ROUND(((a.cost - COALESCE(a.current_value,0)) / a.cost)*100,2) as depreciation_percentage
        FROM assets a LEFT JOIN departments d ON a.department_id=d.department_id ORDER BY a.asset_name`);
      title = 'All Assets Report';
    } else if (type === 'maintenance_due') {
      [data] = await pool.execute(`
        SELECT a.asset_name, a.control_number, a.assigned_to_name, d.department_name,
               m.next_due_date, m.details, m.status, DATEDIFF(m.next_due_date, CURDATE()) as days_until_due
        FROM maintenance m JOIN assets a ON m.asset_id=a.asset_id
        LEFT JOIN departments d ON a.department_id=d.department_id
        WHERE m.status='Pending' AND m.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ORDER BY m.next_due_date ASC`);
      title = 'Maintenance Due Report';
    } else if (type === 'depreciated_assets') {
      [data] = await pool.execute(`
        SELECT a.asset_name, a.control_number, a.purchase_date, a.cost, a.current_value,
               d.department_name, a.status, ROUND(((a.cost-a.current_value)/a.cost)*100,2) as depreciation_percentage,
               DATEDIFF(CURDATE(), a.purchase_date) as days_owned, a.lifetime_years
        FROM assets a LEFT JOIN departments d ON a.department_id=d.department_id
        WHERE a.status='Depreciated' ORDER BY a.purchase_date ASC`);
      title = 'Depreciated Assets Report';
    } else if (type === 'department_summary') {
      [data] = await pool.execute(`
        SELECT d.department_name, d.manager,
               COUNT(a.asset_id) as total_assets,
               SUM(CASE WHEN a.status='Active' THEN 1 ELSE 0 END) as active_assets,
               SUM(CASE WHEN a.status='Depreciated' THEN 1 ELSE 0 END) as depreciated_assets,
               SUM(CASE WHEN a.status='Active' THEN a.cost ELSE 0 END) as total_value,
               AVG(CASE WHEN a.status='Active' THEN a.cost ELSE NULL END) as avg_asset_value
        FROM departments d LEFT JOIN assets a ON d.department_id=a.department_id
        GROUP BY d.department_id ORDER BY total_value DESC`);
      title = 'Department Summary Report';
    } else if (type === 'maintenance_costs') {
      [data] = await pool.execute(`
        SELECT a.asset_name, a.control_number, d.department_name,
               COUNT(m.maintenance_id) as maintenance_count,
               SUM(m.cost) as total_maintenance_cost, AVG(m.cost) as avg_maintenance_cost,
               MAX(m.maintenance_date) as last_maintenance_date
        FROM assets a LEFT JOIN departments d ON a.department_id=d.department_id
        LEFT JOIN maintenance m ON a.asset_id=m.asset_id
        GROUP BY a.asset_id HAVING maintenance_count > 0
        ORDER BY total_maintenance_cost DESC`);
      title = 'Maintenance Cost Analysis';
    } else if (type === 'warranty_status') {
      [data] = await pool.execute(`
        SELECT a.asset_name, a.control_number, d.department_name, a.assigned_to_name,
               a.insurance_end, a.insurance_provider, a.insurance_type,
               CASE WHEN a.insurance_end >= CURDATE() THEN 'Under Warranty' ELSE 'Warranty Expired' END as warranty_status,
               DATEDIFF(a.insurance_end, CURDATE()) as days_until_expires
        FROM assets a LEFT JOIN departments d ON a.department_id=d.department_id
        WHERE a.insurance_end IS NOT NULL ORDER BY a.insurance_end ASC`);
      title = 'Warranty Status Report';
    }

    res.json({ success: true, title, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
