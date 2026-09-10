export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  res.setHeader('Set-Cookie', `cn_auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax;${secure}`);
  res.status(200).json({ ok: true });
}
