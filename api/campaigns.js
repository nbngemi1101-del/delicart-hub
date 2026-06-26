// api/campaigns.js — Proxy đến Pancake POS Ads Manager API (tự động thử nhiều endpoint)
const { verifyToken } = require('./_verify');

const API_KEY = process.env.PANCAKE_API_KEY;
const SHOP_ID = parseInt(process.env.PANCAKE_SHOP_ID || '1504753');

const CANDIDATE_ENDPOINTS = [
  'https://pos.pancake.vn/api/v1/ads-manager/campaigns',
  'https://pos.pancake.vn/api/v2/ads-manager/campaigns',
  'https://pos.pancake.vn/api/ads-manager/campaigns',
  'https://api.pancake.vn/v1/ads-manager/campaigns',
  'https://api.pancake.vn/api/v1/ads-manager/campaigns',
  'https://kapi.pancake.vn/v1/ads-manager/campaigns',
  'https://api-kds.pancake.vn/v1/ads-manager/campaigns',
];

const FIXED = process.env.PANCAKE_CAMPAIGNS_ENDPOINT;

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

  const body = {
    shop_id: SHOP_ID,
    page: 1,
    page_size: 100,
    select_fields: 'spend,impressions,clicks,ctr,cpm,cpc,result_roas,order_created'
  };

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

  const tried = [];
  for (const url of CANDIDATE_ENDPOINTS) {
    try {
      const r = await tryEndpoint(url, body);
      if (r.status === 404 || r.status === 502 || r.status === 503) {
        tried.push({ url, status: r.status });
        continue;
      }
      if (r.ok) {
        const data = await r.json();
        return res.status(200).json({ ...data, _endpoint: url });
      }
      const text = await r.text();
      return res.status(r.status).json({ error: `Lỗi ${r.status} tại ${url}`, detail: text });
    } catch (e) {
      tried.push({ url, error: e.message });
    }
  }

  return res.status(404).json({
    error: 'Không tìm thấy Pancake API endpoint. Hãy set PANCAKE_CAMPAIGNS_ENDPOINT trong Vercel.',
    tried
  });
};
