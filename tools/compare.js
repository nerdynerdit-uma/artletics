// Compares the rebuilt page against the live one, block by block.
// Reports blocks that are missing, and those whose position or size differ most.
//
//   node tools/compare.js welkom            desktop (default)
//   node tools/compare.js welkom mobile

const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LIVE = 'https://www.artletics.nl';
const LOCAL = 'http://127.0.0.1:8000';
const TOLERANCE = 10; // px differences below this are not worth listing
const VIEWPORTS = {
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
};

async function geometry(page, url, viewport) {
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.addStyleTag({
        content: `[data-animation-role], .sqs-block, .fe-block {
            opacity: 1 !important; transform: none !important; visibility: visible !important;
        }`
    });
    // Load everything below the fold, then measure from a known scroll position
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let y = 0;
            const step = () => {
                window.scrollBy(0, window.innerHeight);
                y += window.innerHeight;
                if (y < document.body.scrollHeight) setTimeout(step, 100);
                else { window.scrollTo(0, 0); setTimeout(resolve, 700); }
            };
            step();
        });
    });

    return page.evaluate(() => {
        const blocks = {};
        document.querySelectorAll('[class*="fe-block-"]').forEach(el => {
            const id = [...el.classList].find(c => c.startsWith('fe-block-'));
            const r = el.getBoundingClientRect();
            blocks[id] = {
                left: Math.round(r.left),
                top: Math.round(r.top + window.scrollY),
                width: Math.round(r.width),
                height: Math.round(r.height)
            };
        });
        return { blocks, pageHeight: document.body.scrollHeight };
    });
}

(async () => {
    const slug = process.argv[2] || 'welkom';
    const mode = process.argv[3] || 'desktop';
    const localPath = slug === 'welkom' ? '/' : `/${slug.replace(/__/g, '/')}`;

    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const page = await browser.newPage();

    const live = await geometry(page, `${LIVE}/${slug.replace(/__/g, '/')}`, VIEWPORTS[mode]);
    const local = await geometry(page, LOCAL + localPath, VIEWPORTS[mode]);
    await browser.close();

    const liveIds = Object.keys(live.blocks);
    const localIds = Object.keys(local.blocks);
    const missing = liveIds.filter(id => !local.blocks[id]);
    const extra = localIds.filter(id => !live.blocks[id]);

    console.log(`${slug} (${mode})`);
    console.log(`  page height   live ${live.pageHeight}px | rebuild ${local.pageHeight}px | diff ${local.pageHeight - live.pageHeight}px`);
    console.log(`  blocks        live ${liveIds.length} | rebuild ${localIds.length}`);
    if (missing.length) console.log(`  missing from rebuild: ${missing.length}\n    ${missing.slice(0, 8).join('\n    ')}`);
    if (extra.length) console.log(`  not on live: ${extra.length}\n    ${extra.slice(0, 8).join('\n    ')}`);

    const diffs = liveIds
        .filter(id => local.blocks[id])
        .map(id => {
            const a = live.blocks[id];
            const b = local.blocks[id];
            return {
                id,
                left: b.left - a.left,
                top: b.top - a.top,
                width: b.width - a.width,
                height: b.height - a.height,
                worst: Math.max(Math.abs(b.left - a.left), Math.abs(b.width - a.width), Math.abs(b.height - a.height))
            };
        })
        .filter(d => d.worst > TOLERANCE)
        .sort((x, y) => y.worst - x.worst);

    const aligned = liveIds.filter(id => local.blocks[id]).length - diffs.length;
    console.log(`  within ${TOLERANCE}px: ${aligned} blocks | off: ${diffs.length}`);
    diffs.slice(0, 15).forEach(d => {
        console.log(`    ${d.id.replace('fe-block-', '').slice(0, 22).padEnd(24)} left ${String(d.left).padStart(6)} top ${String(d.top).padStart(6)} width ${String(d.width).padStart(6)} height ${String(d.height).padStart(6)}`);
    });
})();
