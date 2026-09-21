// Screenshots pages with the Chrome already installed on this machine, so we can compare
// the rebuild against the live site.
//
//   node tools/screenshot.js live            all live pages from the sitemap
//   node tools/screenshot.js live welkom     one live page
//   node tools/screenshot.js local index     a local file, from the preview server
//
// Saves to _raw/screens/<slug>-<desktop|mobile>.png

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = '_raw/screens';
const LIVE = 'https://www.artletics.nl';
const LOCAL = 'http://127.0.0.1:8000';
const VIEWPORTS = {
    desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
    mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
};

function livePaths() {
    const xml = fs.readFileSync('_raw/sitemap.xml', 'utf8');
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
}

async function capture(page, url, file, viewport, isLive) {
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    if (isLive) {
        // The live site fades blocks in on scroll, which photographs as empty space
        await page.addStyleTag({
            content: `[data-animation-role], .sqs-block, .fe-block {
                opacity: 1 !important;
                transform: none !important;
                visibility: visible !important;
            }`
        });
    }
    // Squarespace fades content in on scroll, so walk down the page first
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let y = 0;
            const step = () => {
                window.scrollBy(0, window.innerHeight);
                y += window.innerHeight;
                if (y < document.body.scrollHeight) setTimeout(step, 120);
                else { window.scrollTo(0, 0); setTimeout(resolve, 400); }
            };
            step();
        });
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: file, fullPage: true });
    return fs.statSync(file).size;
}

(async () => {
    const [mode = 'live', only] = process.argv.slice(2);
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const targets = mode === 'local'
        ? (only ? [`/${only}.html`] : fs.readdirSync('.').filter(f => f.endsWith('.html')).map(f => `/${f}`))
        : (only ? [`/${only}`] : livePaths());
    const base = mode === 'local' ? LOCAL : LIVE;

    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });
    const page = await browser.newPage();

    for (const target of targets) {
        const slug = target.replace(/^\//, '').replace(/\.html$/, '').replace(/\//g, '__') || 'home';
        for (const [name, viewport] of Object.entries(VIEWPORTS)) {
            const file = path.join(OUT_DIR, `${mode}-${slug}-${name}.png`);
            try {
                const bytes = await capture(page, base + target, file, viewport, mode === 'live');
                console.log(`${slug} ${name}: ${Math.round(bytes / 1024)} KB`);
            } catch (err) {
                console.log(`${slug} ${name}: FAILED ${err.message}`);
            }
        }
    }

    await browser.close();
})();
