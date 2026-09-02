// Minimal zero-dependency static file server for the built SPA (dist/).
// Used by `npm run start` on hosting platforms (e.g. Render) where only
// Node.js is guaranteed to be available — avoids "command not found" (exit 127).
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 10000;
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

async function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const filePath = path.normalize(path.join(DIST_DIR, cleanPath));

  // Prevent path traversal outside of dist/.
  if (!filePath.startsWith(DIST_DIR)) return null;

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      return path.join(filePath, 'index.html');
    }
    return filePath;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  try {
    let filePath = await resolveFile(req.url);

    // SPA fallback: unknown routes without a file extension get index.html.
    if (!filePath && !path.extname(req.url.split('?')[0])) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type':
        MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': filePath.endsWith('index.html')
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Serving dist/ at http://${HOST}:${PORT}`);
});