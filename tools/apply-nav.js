// Refreshes the header, the band at the head of the footer and the ?v= asset stamps in
// every page of the site.
//
//   node tools/apply-nav.js            write the changes
//   node tools/apply-nav.js --check    only report what would change
//
// tools/convert.js rebuilds the pages that have a Squarespace original behind them, but
// not the hand-written ones (workshops.html, aanbod/*). This walks every page instead,
// so one menu change in tools/nav.js reaches all of them. It keeps each page's own
// header theme (header-white / header-black / header-dark) and touches nothing between
// the header and the footer, which makes it safe to run after convert.js and safe to
// run twice.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildNav } = require('./nav');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['_raw', 'node_modules', '.git', '.next', 'tools', 'api', 'assets']);

// The band at the head of the footer, on every page. It is not a block in the Fluid
// Engine grid below it: that grid carries coordinates measured on the live site, and a
// new block there would need placements of its own for desktop and mobile. This sits
// above it instead and brings its own colours (see .footer-cta in base.css).
const FOOTER_CTA = `  <div class="footer-cta">
    <p>Een deelnemer aanmelden of een workshop aanvragen?</p>
    <a class="footer-cta-knop" href="/aanmelden">Direct aanmelden</a>
  </div>`;

// Idempotent: an existing band is taken out first and written again, so changing the
// text above is enough. The sign-up page itself does not get one.
function withFooterCta(html, name) {
    const opening = html.match(/<footer class="site-footer"[^>]*>/);
    if (!opening) return html;
    const zonder = html.replace(/\n[ \t]*<div class="footer-cta">[\s\S]*?<\/div>/, '');
    if (name === 'aanmelden.html') return zonder;
    return zonder.replace(opening[0], `${opening[0]}\n${FOOTER_CTA}`);
}

function pages(dir = ROOT, found = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
                pages(path.join(dir, entry.name), found);
            }
        } else if (entry.name.endsWith('.html')) {
            found.push(path.join(dir, entry.name));
        }
    }
    return found;
}

function stampOf(file) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) return null;
    return crypto.createHash('md5').update(fs.readFileSync(full)).digest('hex').slice(0, 8);
}

const check = process.argv.includes('--check');
let changed = 0;
let missing = 0;

for (const file of pages()) {
    const name = path.relative(ROOT, file).replace(/\\/g, '/');
    const before = fs.readFileSync(file, 'utf8');

    const header = before.match(/<header class="site-header([^"]*)">[\s\S]*?<\/header>/);
    if (!header) {
        console.log(`  ?  ${name}: no site header found, skipped`);
        continue;
    }
    // Themes are white, black, dark and black-bold (set per page by convert.js)
    const theme = (header[1].match(/header-([a-z-]+)/) || [])[1] || 'white';

    let after = before.replace(header[0], buildNav(theme));
    after = withFooterCta(after, name);

    // A page with no page stylesheet of its own needs assets/css/footer.css, or the
    // footer loses its grid and every block stacks against the left edge.
    if (after.includes('plain-pages.css') && !after.includes('footer.css')) {
        console.log(`  !  ${name}: loads plain-pages.css but not footer.css, `
            + `so its footer has no layout`);
        missing++;
    }

    // Re-stamp the stylesheets and the script so a changed file is not served from a
    // stale cache. Only CSS and JS, which is what convert.js stamps; images keep their
    // plain paths.
    after = after.replace(/(["'])\/(assets\/(?:css|js)\/[^"'?]+)(\?v=[0-9a-f]+)?\1/g, (all, q, asset) => {
        const stamp = stampOf(asset);
        if (!stamp) {
            console.log(`  !  ${name}: ${asset} does not exist`);
            missing++;
            return all;
        }
        return `${q}/${asset}?v=${stamp}${q}`;
    });

    if (after === before) continue;
    changed++;
    console.log(`  ${check ? '~' : '>'}  ${name}`);
    if (!check) fs.writeFileSync(file, after);
}

console.log(changed
    ? `\n${changed} page(s) ${check ? 'would change' : 'updated'}`
    : '\nevery page already matches tools/nav.js');
if (missing) {
    console.log(`${missing} asset reference(s) point at a file that is not there`);
    process.exitCode = 1;
}
