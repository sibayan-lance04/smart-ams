const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'asset_management',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

async function logActivity(userId, actionType, tableName, description) {
  try {
    await pool.execute(
      'INSERT INTO activity_log (user_id, action_type, table_name, description, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [userId, actionType, tableName, description]
    );
  } catch (err) {
    console.error('Activity logging failed:', err.message);
  }
}

function calculateCurrentValue(cost, lifetimeYears, purchaseDate, method = 'straight-line') {
  cost = parseFloat(cost);
  lifetimeYears = parseInt(lifetimeYears);
  const purchase = new Date(purchaseDate);
  const now = new Date();
  const yearsElapsed = (now - purchase) / (365.25 * 24 * 60 * 60 * 1000);
  if (yearsElapsed <= 0) return cost;
  if (yearsElapsed >= lifetimeYears) return 0;
  if (method === 'declining-balance') {
    const rate = 2 / lifetimeYears;
    return Math.max(0, cost * Math.pow(1 - rate, yearsElapsed));
  }
  // straight-line
  return Math.max(0, cost - (cost / lifetimeYears) * yearsElapsed);
}

module.exports = { pool, logActivity, calculateCurrentValue };
