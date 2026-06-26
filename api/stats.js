// api/stats.js — Proxy đến Pancake POS Statistics API
const { verifyToken } = require('./_verify');

const API_KEY  = process.env.PANCAKE_API_KEY;
const API_BASE = process.env.PANCAKE_API_BASE || 'https://pos.pancake.vn';
const SHOP_ID  = parseInt(process.env.PANCAKE_SHOP_ID || '1504753');

// Endpoint statistics của Pancake POS REST API
// Nếu endpoint này trả lỗi 404, kiểm tra lại PANCAKE_API_BASE trong Vercel env vars
const STATS_ENDPOINT = `${API_BASE}/api/v1/statistics/analytics-sale`;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Xác thực JWT
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'PANCAKE_API_KEY chưa được cấu hình trong Vercel' });
  }

  const { since, until } = req.query;

  const body = {
    shop_id: SHOP_ID,
    since:   since  || new Date(Date.now() - 30 * 86400000).toISOString(),
    until:   until  || new Date().toISOString(),
    split_by: ['Time.day'],
    select_fields: [
      'revenue', 'order_count', 'total_order_count', 'profit',
      'capital', 'new_customer_count', 'old_customer_count',
      'close_rate', 'ads_amount', 'canceled_order_count'
    ]
  };

  try {
    const response = await fetch(STATS_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: `Pancake API lỗi ${response.status}`,
        detail: text,
        endpoint_used: STATS_ENDPOINT
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message, endpoint_used: STATS_ENDPOINT });
  }
};
