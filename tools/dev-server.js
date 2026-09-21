// Local preview server for the static site.
//   npm run preview   ->   http://127.0.0.1:8000

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const ROOT = path.join(__dirname, '..');
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.pdf': 'application/pdf'
};

http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    if (pathname === '/') pathname = '/index.html';
    if (!path.extname(pathname)) pathname += '.html';

    const filePath = path.join(ROOT, path.normalize(pathname));
    if (!filePath.startsWith(ROOT)) {
        res.statusCode = 403;
        return res.end('Forbidden');
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.statusCode = 404;
            return res.end('Not found');
        }
        res.setHeader('Content-Type', TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(data);
    });
}).listen(PORT, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${PORT}`));
