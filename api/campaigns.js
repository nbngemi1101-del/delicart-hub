// api/campaigns.js — Proxy đến Pancake POS Ads Manager API
const { verifyToken } = require('./_verify');

const API_KEY  = process.env.PANCAKE_API_KEY;
const API_BASE = process.env.PANCAKE_API_BASE || 'https://pos.pancake.vn';
const SHOP_ID  = parseInt(process.env.PANCAKE_SHOP_ID || '1504753');

const CAMPAIGNS_ENDPOINT = `${API_BASE}/api/v1/ads-manager/campaigns`;

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

  try {
    const response = await fetch(CAMPAIGNS_ENDPOINT, {
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
        endpoint_used: CAMPAIGNS_ENDPOINT
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message, endpoint_used: CAMPAIGNS_ENDPOINT });
  }
};
