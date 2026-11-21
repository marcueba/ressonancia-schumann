/** Minimal handler candidate. No dependencies, version metadata, or broad route registration. */
export function sendHealth(req, res) {
  if (req.url?.split('?', 1)[0] !== '/healthz' || !['GET','HEAD'].includes(req.method)) return false;
  const payload = '{"status":"ok"}';
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(req.method === 'HEAD' ? undefined : payload);
  return true;
}
