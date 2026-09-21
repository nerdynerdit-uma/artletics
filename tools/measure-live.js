// Measures how text actually renders on the live site, so the rebuild can match it.
// Squarespace sizes some text with script ("scaled text") and derives the rest from
// theme settings, so reading the HTML alone is not enough.
//
//   node tools/measure-live.js welkom      one page
//   node tools/measure-live.js --all       every downloaded page
//
// Writes _raw/measurements/<slug>.json

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LIVE = 'https://www.artletics.nl';
const OUT_DIR = '_raw/measurements';
const VIEWPORTS = {
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
};

function slugToPath(slug) {
    return '/' + slug.replace(/__/g, '/');
}

async function measure(page, url, viewport) {
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(() => new Promise(r => setTimeout(r, 1200))); // let scaled text settle

    return page.evaluate(() => {
        // Sections carry their own minimum height and padding, which the markup does not show
        const sections = [...document.querySelectorAll('section.page-section')].map(section => {
            const style = getComputedStyle(section);
            const wrapper = section.querySelector('.content-wrapper');
            const wrapperStyle = wrapper ? getComputedStyle(wrapper) : null;
            const num = value => Math.round(parseFloat(value) || 0);
            // Decorative line along the section edge (e.g. the green wave on Partners).
            // Its shape differs per breakpoint, so it is measured, not read from the HTML.
            // The section's background is also clipped along that shape (clipPath), e.g.
            // the V on Subsidieregeling
            const dividerPath = section.querySelector('.section-divider-svg-stroke path');
            const clipPath = section.querySelector('clipPath path');
            const divider = dividerPath || clipPath ? {
                d: dividerPath ? dividerPath.getAttribute('d') : null,
                stroke: dividerPath ? getComputedStyle(dividerPath).stroke : null,
                width: dividerPath ? getComputedStyle(dividerPath).strokeWidth : null,
                clip: clipPath ? clipPath.getAttribute('d') : null
            } : null;
            // Colours and background as painted, whatever theme name the section uses
            const bgEl = section.querySelector('.section-background');
            const overlay = section.querySelector('.section-background-overlay');
            const bgImg = bgEl && bgEl.querySelector('img');
            const background = {
                color: bgEl ? getComputedStyle(bgEl).backgroundColor : null,
                text: getComputedStyle(section).color,
                overlay: overlay ? {
                    color: getComputedStyle(overlay).backgroundColor,
                    opacity: getComputedStyle(overlay).opacity
                } : null,
                image: bgImg ? {
                    fit: getComputedStyle(bgImg).objectFit,
                    position: getComputedStyle(bgImg).objectPosition
                } : null,
                video: !!(bgEl && bgEl.querySelector('video')),
                // Negative when the background reaches up behind a divider above it
                top: bgEl ? Math.round(bgEl.getBoundingClientRect().top - section.getBoundingClientRect().top) : 0
            };
            return {
                background,
                divider,
                id: section.getAttribute('data-section-id') || '',
                height: Math.round(section.getBoundingClientRect().height),
                minHeight: num(style.minHeight),
                padTop: num(style.paddingTop),
                padBottom: num(style.paddingBottom),
                wrapTop: wrapperStyle ? num(wrapperStyle.paddingTop) : 0,
                wrapBottom: wrapperStyle ? num(wrapperStyle.paddingBottom) : 0
            };
        });

        const out = {};
        document.querySelectorAll('[class*="fe-block-"]').forEach(block => {
            const id = [...block.classList].find(c => c.startsWith('fe-block-'));
            const width = block.getBoundingClientRect().width;
            if (!id || !width) return;

            // Every text element, in order, including empty ones: a block often mixes
            // sizes (a large opening paragraph, then smaller body text and spacers), and
            // empty paragraphs set the spacing between them.
            const text = [];
            block.querySelectorAll('h1, h2, h3, h4, p, li, blockquote').forEach((el, index) => {
                const s = getComputedStyle(el);
                text.push({
                    index,
                    tag: el.tagName.toLowerCase(),
                    size: Math.round(parseFloat(s.fontSize) * 10) / 10,
                    lineHeight: s.lineHeight,
                    weight: s.fontWeight,
                    letterSpacing: s.letterSpacing,
                    align: s.textAlign,
                    marginTop: Math.round(parseFloat(s.marginTop) || 0),
                    marginBottom: Math.round(parseFloat(s.marginBottom) || 0)
                });
            });
            if (!text.length) return;

            out[id] = {
                width: Math.round(width),
                scaled: !!block.querySelector('.sqsrte-scaled-text-container, .sqsrte-scaled-text'),
                text
            };
        });
        return { blocks: out, sections };
    });
}

(async () => {
    const args = process.argv.slice(2);
    const slugs = args.includes('--all')
        ? fs.readdirSync('_raw/pages').map(f => f.replace(/\.html$/, ''))
        : args.filter(a => !a.startsWith('--'));

    if (!slugs.length) {
        console.log('usage: node tools/measure-live.js <slug> | --all');
        process.exit(1);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const page = await browser.newPage();

    for (const slug of slugs) {
        try {
            const data = {};
            for (const [name, viewport] of Object.entries(VIEWPORTS)) {
                data[name] = await measure(page, LIVE + slugToPath(slug), viewport);
            }
            fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(data, null, 2));
            const blocks = data.desktop.blocks;
            const scaled = Object.values(blocks).filter(b => b.scaled).length;
            console.log(`${slug.padEnd(38)} ${Object.keys(blocks).length} blocks, ${data.desktop.sections.length} sections, ${scaled} scaled-text`);
        } catch (err) {
            console.log(`${slug.padEnd(38)} FAILED ${err.message}`);
        }
    }

    await browser.close();
})();
