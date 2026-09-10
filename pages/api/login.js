import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const pin = process.env.ACCESS_PIN;
  if (!pin) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const { pin: candidate } = req.body || {};
  if (typeof candidate !== 'string' || candidate !== pin) {
    return res.status(401).json({ error: 'invalid_pin' });
  }

  const hash = crypto.createHash('sha256').update(pin).digest('hex');
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  res.setHeader(
    'Set-Cookie',
    `cn_auth=${hash}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax;${secure}`
  );
  res.status(200).json({ ok: true });
}
