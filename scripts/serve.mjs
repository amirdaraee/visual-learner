// A small static file server for local work and the tests: node scripts/serve.mjs [port]. No dependencies.
// It exists because Python's built-in server drops connections when several browsers load pages at once.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 8844);
const host = process.env.HOST || '127.0.0.1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2' };

async function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, clean);
  if (!file.startsWith(root)) return null;
  try { const s = await stat(file); if (s.isDirectory()) file = join(file, 'index.html'); await stat(file); return file; } catch { return null; }
}

const server = createServer(async (req, res) => {
  const file = await resolve(req.url || '/');
  if (!file) {
    const nf = await readFile(join(root, '404.html')).catch(() => Buffer.from('Not found'));
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); res.end(nf); return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Error'); }
});
server.keepAliveTimeout = 30_000;
server.listen({ port, host, backlog: 511 }, () => console.log(`Serving ${root} at http://${host}:${port}/`));
