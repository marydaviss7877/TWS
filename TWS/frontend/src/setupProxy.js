const { createProxyMiddleware } = require('http-proxy-middleware');

const API_TARGET = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const proxyOptions = {
  target: API_TARGET,
  changeOrigin: true,
  timeout: 30000,
  onError: function (err, req, res) {
    console.log('Proxy error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  }
};

module.exports = function(app) {
  // Proxy all API calls to the backend
  app.use('/api', createProxyMiddleware(proxyOptions));

  // Proxy uploaded files (logos, profile pics, etc.) to the backend static file server
  app.use('/uploads', createProxyMiddleware(proxyOptions));
};
