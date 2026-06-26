// api/stats.js — Proxy đến Pancake POS Statistics API
const { verifyToken } = require('./_verify');

const API_KEY = process.env.PANCAKE_API_KEY;
const SHOP_ID = process.env.PANCAKE_SHOP_ID || '1504753';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: 'PANCAKE_API_KEY chưa được cấu hình trong Vercel' });
  }

  const { since, until } = req.query;
  const sinceDate = since || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const untilDate = until || new Date().toISOString().split('T')[0];

  const url = `https://pos.pancake.vn/api/v1/shops/${SHOP_ID}/statistics/analytics-sale?access_token=${API_KEY}`;

  const body = {
    since: sinceDate,
    until: untilDate,
    split_by: ['Time.day'],
    select_fields: ['revenue', 'order_count', 'total_order_count', 'profit',
      'capital', 'new_customer_count', 'old_customer_count',
      'close_rate', 'ads_amount', 'canceled_order_count']
  };

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (r.ok) return res.status(200).json({ ...data, _endpoint: url.split('?')[0] });
    return res.status(r.status).json({ error: `Pancake API lỗi ${r.status}`, detail: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
