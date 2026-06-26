// api/_verify.js — Shared JWT verification (underscore = không phải endpoint)
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'change-this-secret';

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const [h, p, s] = token.split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url');
    if (s !== expected) return null;
    const data = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

module.exports = { verifyToken };
