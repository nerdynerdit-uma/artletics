// Loads a rebuilt page in Chrome and reports anything that fails to load.
//   node tools/check-page.js            the homepage
//   node tools/check-page.js /dans.html a specific page

const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:8000';

(async () => {
    // Accept "contact.html", "/contact.html" or a full local URL
    const arg = (process.argv[2] || '/').replace(/^.*127\.0\.0\.1:\d+/, '');
    const target = arg === '/' ? '/' : '/' + arg.replace(/^\/+/, '');
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const page = await browser.newPage();

    const problems = [];
    page.on('requestfailed', r => problems.push(`failed  ${r.url()}`));
    page.on('response', r => { if (r.status() >= 400) problems.push(`${r.status()}     ${r.url()}`); });
    page.on('pageerror', e => problems.push(`js error: ${e.message}`));

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE + target, { waitUntil: 'networkidle2', timeout: 60000 });

    // Images are lazy-loaded, so walk the page before judging what loaded
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let y = 0;
            const step = () => {
                window.scrollBy(0, window.innerHeight);
                y += window.innerHeight;
                if (y < document.body.scrollHeight) setTimeout(step, 100);
                else { window.scrollTo(0, 0); setTimeout(resolve, 500); }
            };
            step();
        });
    });
    await page.evaluate(() => Promise.all(
        [...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; }))
    ));

    const report = await page.evaluate(() => {
        const broken = [];
        document.querySelectorAll('img').forEach(img => {
            if (!img.complete || img.naturalWidth === 0) broken.push(img.getAttribute('src'));
        });
        return {
            images: document.querySelectorAll('img').length,
            broken,
            sections: document.querySelectorAll('.page-section').length,
            blocks: document.querySelectorAll('.fe-block').length,
            height: document.body.scrollHeight,
            emptyBlocks: [...document.querySelectorAll('.fe-block')]
                .filter(b => !b.textContent.trim() && !b.querySelector('img, iframe, video')).length
        };
    });

    console.log(`page ${target}`);
    console.log(`  sections ${report.sections} | blocks ${report.blocks} | images ${report.images} | page height ${report.height}px`);
    if (report.emptyBlocks) console.log(`  empty blocks: ${report.emptyBlocks}`);
    if (report.broken.length) {
        console.log(`  broken images: ${report.broken.length}`);
        report.broken.slice(0, 10).forEach(u => console.log('    ', u));
    }
    const unique = [...new Set(problems)];
    if (unique.length) {
        console.log(`  load problems: ${unique.length}`);
        unique.slice(0, 10).forEach(p => console.log('    ', p.slice(0, 120)));
    }
    if (!report.broken.length && !unique.length) console.log('  no loading problems');

    await browser.close();
})();
