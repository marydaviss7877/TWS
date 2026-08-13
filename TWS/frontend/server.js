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
const zlib = require('zlib');

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
      // Preserve the browser's original Host (e.g. a tenant subdomain) —
      // the line above overwrites `host` with the backend's own upstream
      // address, so without this the backend can never tell which
      // subdomain a request actually came in on.
      'x-forwarded-host': req.headers.host,
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

function serveStaticFile(filePath, req, res) {
  fs.stat(filePath, (err, stats) => {
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
    const etag = `W/\"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}\"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag, 'Cache-Control': cacheControl });
      return res.end();
    }

    const compressible = /^(text\/|application\/(javascript|json|manifest\+json)|image\/svg\+xml)/.test(contentType);
    const accepts = req.headers['accept-encoding'] || '';
    const useGzip = compressible && stats.size > 1024 && /\bgzip\b/.test(accepts);
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      ETag: etag,
      'X-Content-Type-Options': 'nosniff'
    };
    if (compressible) headers.Vary = 'Accept-Encoding';
    if (useGzip) headers['Content-Encoding'] = 'gzip';
    else headers['Content-Length'] = stats.size;

    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.destroy());
    if (useGzip) stream.pipe(zlib.createGzip({ level: 6 })).pipe(res);
    else stream.pipe(res);
  });
}

function serveIndexHtml(req, res) {
  serveStaticFile(path.join(BUILD_DIR, 'index.html'), req, res);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Bad Request');
  }

  // Proxy API and uploaded-file requests to the backend
  if (pathname.startsWith('/api') || pathname.startsWith('/uploads')) {
    return proxyToBackend(req, res);
  }

  // Attempt to serve a static file
  const filePath = path.resolve(BUILD_DIR, `.${pathname}`);
  if (filePath !== BUILD_DIR && !filePath.startsWith(`${BUILD_DIR}${path.sep}`)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Bad Request');
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      return serveStaticFile(filePath, req, res);
    }
    // SPA fallback
    serveIndexHtml(req, res);
  });
});

server.listen(PORT, () => {
  console.log(`[frontend] Listening on port ${PORT}`);
  console.log(`[frontend] Proxying /api/* and /uploads/* → ${BACKEND_URL}`);
});
