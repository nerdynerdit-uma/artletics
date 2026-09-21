// Saves each live page as the browser sees it after scripts have run.
// Squarespace builds galleries, portfolio grids and blog listings with JavaScript, so
// the raw HTML from the server is incomplete. Converting from the rendered page picks
// those up.
//
//   node tools/fetch-rendered.js            every page in the sitemap
//   node tools/fetch-rendered.js welkom     one page
//
// Writes _raw/rendered/<slug>.html

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LIVE = 'https://www.artletics.nl';
const OUT_DIR = '_raw/rendered';

function slugsFromSitemap() {
    const xml = fs.readFileSync('_raw/sitemap.xml', 'utf8');
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map(m => new URL(m[1]).pathname.replace(/^\//, '').replace(/\//g, '__'));
}

(async () => {
    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const slugs = args.length ? args : slugsFromSitemap();

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    for (const slug of slugs) {
        const url = `${LIVE}/${slug.replace(/__/g, '/')}`;
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Walk the page so lazy content and galleries build themselves
            await page.evaluate(async () => {
                await new Promise(resolve => {
                    let y = 0;
                    const step = () => {
                        window.scrollBy(0, window.innerHeight);
                        y += window.innerHeight;
                        if (y < document.body.scrollHeight * 1.2) setTimeout(step, 120);
                        else { window.scrollTo(0, 0); setTimeout(resolve, 900); }
                    };
                    step();
                });
            });

            const html = await page.content();
            fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html);
            const imgs = (html.match(/<img\b/g) || []).length;
            console.log(`${slug.padEnd(38)} ${Math.round(html.length / 1024)} KB, ${imgs} images`);
        } catch (err) {
            console.log(`${slug.padEnd(38)} FAILED ${err.message}`);
        }
    }

    await browser.close();
})();
