// api/auth.js — Xác thực đăng nhập, trả về JWT token
const crypto = require('crypto');

const SECRET   = process.env.JWT_SECRET        || 'change-this-secret';
const USERNAME = process.env.ADMIN_USERNAME    || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD    || 'delicart2024';

function createToken(sub) {
  const h = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
  const p = Buffer.from(JSON.stringify({ sub, iat: Date.now(), exp: Date.now() + 24 * 3600 * 1000 })).toString('base64url');
  const s = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { username, password } = body || {};

  if (!username || !password || username !== USERNAME || password !== PASSWORD) {
    return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
  }

  const token = createToken(username);
  return res.status(200).json({ token, username });
};
