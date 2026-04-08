/**
 * Production server for the frontend.
 * Proxies /api/* and /uploads/* to the backend, serves static files for everything else.
 *
 * Required env vars:
 *   PORT        – port to listen on (default 3000)
 *   BACKEND_URL – full URL of the backend service, e.g. https://backend.railway.app
 */
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const url = require('url');

const PORT = process.env.PORT || 3000;
const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, ''); // strip trailing slash

const BUILD_DIR = path.join(__dirname, 'build');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json',
  '.txt':  'text/plain',
  '.webmanifest': 'application/manifest+json',
};

function proxyToBackend(req, res) {
  const target = new URL(BACKEND_URL);
  const isHttps = target.protocol === 'https:';
  const defaultPort = isHttps ? 443 : 80;

  const options = {
    hostname: target.hostname,
    port: target.port ? parseInt(target.port, 10) : defaultPort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: target.host,
    },
  };

  const transport = isHttps ? https : http;

  const proxyReq = transport.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[proxy] Error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end('Bad Gateway: ' + err.message);
  });

  req.pipe(proxyReq, { end: true });
}

function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    // Cache static assets (hashed filenames) aggressively; no-cache index.html
    const isHashed = /\.[a-f0-9]{8,}\.[a-z]+$/.test(filePath);
    const cacheControl = isHashed
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate';

    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': cacheControl });
    res.end(data);
  });
}

function serveIndexHtml(res) {
  serveStaticFile(path.join(BUILD_DIR, 'index.html'), res);
}

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);

  // Proxy API and uploaded-file requests to the backend
  if (pathname.startsWith('/api') || pathname.startsWith('/uploads')) {
    return proxyToBackend(req, res);
  }

  // Attempt to serve a static file
  const filePath = path.join(BUILD_DIR, pathname);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return serveStaticFile(filePath, res);
    }
    // SPA fallback
    serveIndexHtml(res);
  });
});

server.listen(PORT, () => {
  console.log(`[frontend] Listening on port ${PORT}`);
  console.log(`[frontend] Proxying /api/* and /uploads/* → ${BACKEND_URL}`);
});
