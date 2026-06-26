// api/stats.js — Proxy đến Pancake POS Statistics API (tự động thử nhiều endpoint)
const { verifyToken } = require('./_verify');

const API_KEY = process.env.PANCAKE_API_KEY;
const SHOP_ID = parseInt(process.env.PANCAKE_SHOP_ID || '1504753');

// Danh sách endpoint sẽ thử lần lượt cho đến khi thành công
const CANDIDATE_ENDPOINTS = [
  'https://pos.pancake.vn/api/v1/statistics/analytics-sale',
  'https://pos.pancake.vn/api/v2/statistics/analytics-sale',
  'https://pos.pancake.vn/api/statistics/analytics-sale',
  'https://api.pancake.vn/v1/statistics/analytics-sale',
  'https://api.pancake.vn/api/v1/statistics/analytics-sale',
  'https://kapi.pancake.vn/v1/statistics/analytics-sale',
  'https://api-kds.pancake.vn/v1/statistics/analytics-sale',
];

// Nếu đã biết endpoint đúng, set PANCAKE_STATS_ENDPOINT trong Vercel để bỏ qua auto-detect
const FIXED = process.env.PANCAKE_STATS_ENDPOINT;

async function tryEndpoint(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });
  return r;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: 'PANCAKE_API_KEY chưa được cấu hình trong Vercel' });
  }

  const { since, until } = req.query;
  const body = {
    shop_id: SHOP_ID,
    since:  since || new Date(Date.now() - 30 * 86400000).toISOString(),
    until:  until || new Date().toISOString(),
    split_by: ['Time.day'],
    select_fields: ['revenue','order_count','total_order_count','profit',
      'capital','new_customer_count','old_customer_count',
      'close_rate','ads_amount','canceled_order_count']
  };

  // Nếu đã biết endpoint cố định, dùng luôn
  if (FIXED) {
    try {
      const r = await tryEndpoint(FIXED, body);
      const data = await r.json();
      if (r.ok) return res.status(200).json({ ...data, _endpoint: FIXED });
      return res.status(r.status).json({ error: `Lỗi ${r.status}`, endpoint_used: FIXED });
    } catch (e) {
      return res.status(500).json({ error: e.message, endpoint_used: FIXED });
    }
  }

  // Auto-detect: thử từng endpoint
  const tried = [];
  for (const url of CANDIDATE_ENDPOINTS) {
    try {
      const r = await tryEndpoint(url, body);
      if (r.status === 404 || r.status === 502 || r.status === 503) {
        tried.push({ url, status: r.status });
        continue; // thử cái tiếp theo
      }
      if (r.ok) {
        const data = await r.json();
        // Lưu lại endpoint đúng vào response để dễ debug
        return res.status(200).json({ ...data, _endpoint: url });
      }
      // 401/403 = URL đúng nhưng auth sai
      const text = await r.text();
      return res.status(r.status).json({ error: `Lỗi ${r.status} tại ${url}`, detail: text });
    } catch (e) {
      tried.push({ url, error: e.message });
    }
  }

  return res.status(404).json({
    error: 'Không tìm thấy Pancake API endpoint phù hợp. Hãy set PANCAKE_STATS_ENDPOINT trong Vercel.',
    tried
  });
};
