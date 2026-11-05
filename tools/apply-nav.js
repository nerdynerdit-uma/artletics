// Refreshes the header and the ?v= asset stamps in every page of the site.
//
//   node tools/apply-nav.js            write the changes
//   node tools/apply-nav.js --check    only report what would change
//
// tools/convert.js rebuilds the pages that have a Squarespace original behind them, but
// not the hand-written ones (workshops.html, aanbod/*). This walks every page instead,
// so one menu change in tools/nav.js reaches all of them. It keeps each page's own
// header theme (header-white / header-black / header-dark) and leaves everything below
// the header alone, which makes it safe to run after convert.js and safe to run twice.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildNav } = require('./nav');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['_raw', 'node_modules', '.git', '.next', 'tools', 'api', 'assets']);

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
