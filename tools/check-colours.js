// Compares the colour actually visible in the middle of every section, live vs rebuild.
// Reads the rendered pixel, so it catches layers, themes and overlays alike.
//
//   node tools/check-colours.js            every page
//   node tools/check-colours.js partners   one page

const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LIVE = 'https://www.artletics.nl';
const LOCAL = 'http://127.0.0.1:8000';
const TOLERANCE = 40; // sum of RGB differences treated as the same colour

async function sectionColours(page, url) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.addStyleTag({ content: '[data-animation-role],.sqs-block,.fe-block{opacity:1!important;transform:none!important}' });
    // Hide text and images inside sections so we read the background, not the content
    await page.addStyleTag({ content: '.fe-block, .content, .gallery-reel, .gallery-masonry, .grid-cards, .item-list { visibility: hidden !important; }' });
    const boxes = await page.evaluate(() =>
        [...document.querySelectorAll('section.page-section')].map(s => {
            const r = s.getBoundingClientRect();
            return { x: Math.round(r.left + 8), y: Math.round(r.top + window.scrollY + r.height / 2), footer: !!s.closest('footer') };
        }));
    const colours = [];
    for (const b of boxes) {
        await page.evaluate(y => window.scrollTo(0, Math.max(0, y - 400)), b.y);
        await new Promise(r => setTimeout(r, 250));
        const vy = await page.evaluate(y => y - window.scrollY, b.y);
        const shot = await page.screenshot({ clip: { x: b.x, y: vy, width: 1, height: 1 }, encoding: 'binary' });
        // Decode the single pixel with the browser, which already knows PNG
        const rgb = await page.evaluate(async data => {
            const blob = new Blob([new Uint8Array(data)], { type: 'image/png' });
            const bmp = await createImageBitmap(blob);
            const c = new OffscreenCanvas(1, 1).getContext('2d');
            c.drawImage(bmp, 0, 0);
            return [...c.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        }, [...shot]);
        colours.push({ rgb, footer: b.footer });
    }
    return colours;
}

(async () => {
    const only = process.argv[2];
    const slugs = only ? [only] : fs.readdirSync('_raw/pages').map(f => f.replace(/\.html$/, ''));
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    let mismatches = 0;
    for (const slug of slugs) {
        const livePath = '/' + slug.replace(/__/g, '/');
        const localPath = slug === 'welkom' ? '/' : livePath;
        const live = await sectionColours(page, LIVE + livePath);
        const local = await sectionColours(page, LOCAL + localPath);
        const n = Math.max(live.length, local.length);
        const bad = [];
        for (let i = 0; i < n; i++) {
            const a = live[i], b = local[i];
            if (!a || !b) { bad.push(`#${i + 1} missing`); continue; }
            const diff = a.rgb.reduce((s, v, k) => s + Math.abs(v - b.rgb[k]), 0);
            if (diff > TOLERANCE) bad.push(`#${i + 1}${a.footer ? ' (footer)' : ''} live rgb(${a.rgb}) vs rebuild rgb(${b.rgb})`);
        }
        mismatches += bad.length;
        console.log(`${slug.padEnd(40)} ${bad.length ? bad.length + ' different: ' + bad.join('; ') : 'all ' + n + ' sections match'}`);
    }
    console.log(`\n${mismatches} section colour differences`);
    await browser.close();
})();
