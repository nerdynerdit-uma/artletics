// Downloads every image the live site uses into assets/images/ and writes a manifest.
// Squarespace serves resized copies; ?format=2500w asks for the largest available.
// Usage: node tools/fetch-images.js

const fs = require('fs');
const path = require('path');

const LIST = '_raw/image-urls.txt';
const OUT_DIR = 'assets/images';
const MANIFEST = '_raw/image-manifest.json';
const CONCURRENCY = 6;
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

function localName(url) {
    // .../content/v1/<siteId>/<uuid>/<filename> -> <uuid-prefix>-<filename>
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const file = decodeURIComponent(parts[parts.length - 1]);
    const uuid = parts[parts.length - 2] || '';
    const safe = file.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-');
    return `${uuid.slice(0, 8)}-${safe}`;
}

async function download(url) {
    const name = localName(url);
    const dest = path.join(OUT_DIR, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
        return { url, file: dest, bytes: fs.statSync(dest).size, cached: true };
    }
    const res = await fetch(`${url}?format=2500w`, { headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return { url, file: dest, bytes: buf.length, type: res.headers.get('content-type') };
}

(async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const urls = fs.readFileSync(LIST, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
    const results = [];
    const failures = [];
    let next = 0;

    async function worker() {
        while (next < urls.length) {
            const url = urls[next++];
            try {
                results.push(await download(url));
            } catch (err) {
                failures.push({ url, error: err.message });
            }
        }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    fs.writeFileSync(MANIFEST, JSON.stringify({ downloaded: results, failures }, null, 2));
    const total = results.reduce((sum, r) => sum + r.bytes, 0);
    console.log(`downloaded ${results.length}/${urls.length} images, ${(total / 1048576).toFixed(1)} MB`);
    if (failures.length) {
        console.log(`${failures.length} failed:`);
        failures.slice(0, 10).forEach(f => console.log('  ', f.error, f.url.slice(0, 90)));
    }
})();
