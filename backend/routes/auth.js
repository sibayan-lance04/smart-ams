const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool, logActivity } = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  try {
    const [rows] = await pool.execute(
      'SELECT user_id, full_name, username, password, role FROM users WHERE username = ?',
      [username]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    req.session.userId = user.user_id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;
    req.session.role = user.role;

    await logActivity(user.user_id, 'LOGIN', 'users', 'User logged in');
    res.json({ success: true, user: { id: user.user_id, username: user.username, fullName: user.full_name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  if (req.session.userId) {
    await logActivity(req.session.userId, 'LOGOUT', 'users', 'User logged out');
  }
  req.session.destroy(() => res.json({ success: true }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId)
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  res.json({
    success: true,
    user: {
      id: req.session.userId,
      username: req.session.username,
      fullName: req.session.fullName,
      role: req.session.role,
    },
  });
});

module.exports = router;
