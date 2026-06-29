const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db, generateShareCode } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function uniqueShareCode() {
  let code;
  do {
    code = generateShareCode();
  } while (db.prepare('SELECT id FROM users WHERE share_code = ?').get(code));
  return code;
}

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Username or email already taken' });
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const shareCode = uniqueShareCode();

  db.prepare(
    'INSERT INTO users (id, username, email, password_hash, share_code) VALUES (?, ?, ?, ?, ?)'
  ).run(id, username.trim(), email.trim().toLowerCase(), passwordHash, shareCode);

  const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '30d' });

  res.status(201).json({
    token,
    user: { id, username, email, shareCode }
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      shareCode: user.share_code
    }
  });
});

module.exports = router;
