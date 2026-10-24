import { createServer } from 'node:http';
import next from 'next';

const port = Number(process.env.WEB_PORT || 3000);
const hostname = process.env.WEB_HOST || '127.0.0.1';
const app = next({ dev: process.env.NODE_ENV !== 'production', dir: import.meta.dirname, hostname, port });
const handle = app.getRequestHandler();
await app.prepare();
createServer((request, response) => {
  // Only the immediate TCP peer is trusted. Next's default proxy preserves a
  // client-supplied X-Forwarded-For, which would let callers evade IP limits.
  delete request.headers.forwarded;
  delete request.headers['x-real-ip'];
  request.headers['x-forwarded-for'] = request.socket.remoteAddress || 'unknown';
  void handle(request, response);
}).listen(port, hostname);
