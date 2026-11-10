// Pulls the footer's layout out of a generated page stylesheet into one of its own.
//
//   node tools/build-footer-css.js            write assets/css/footer.css
//   node tools/build-footer-css.js --check    only say whether it is still in step
//
// Why this exists: the footer is a Squarespace Fluid Engine section, and its block
// placements live in the per-page CSS that convert.js writes, one copy per converted
// page. The pages written by hand (aanbod, aanmelden, the workshop pages) load
// base.css, plain-pages.css and overrides.css instead, so they got the footer markup
// without any of its layout and everything stacked against the left edge.
//
// Rather than copy those rules by hand, they are lifted straight out of a converted
// page, so a reconversion cannot leave the two versions saying different things. Run
// this after convert.js if the footer ever changes.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRON_HTML = path.join(ROOT, 'klachten.html');      // the page the footer is taken from
const BRON_CSS = path.join(ROOT, 'assets/css/pages/klachten.css');
const UIT = path.join(ROOT, 'assets/css/footer.css');

// Which identifiers belong to the footer: read them off the markup rather than
// hard-coding a list of hashes that nobody can check.
function footerNamen() {
    const html = fs.readFileSync(BRON_HTML, 'utf8');
    const footer = html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/);
    if (!footer) throw new Error('klachten.html has no site footer');

    const namen = new Set();
    for (const m of footer[0].matchAll(/\b(fe-(?:block-)?[A-Za-z0-9_]+)/g)) namen.add(m[1]);
    for (const m of footer[0].matchAll(/id="([^"]+)"/g)) namen.add(m[1]);
    namen.delete('fe-block');          // the bare class, shared with every other section
    return [...namen];
}

// Split CSS into top-level pieces, keeping each rule's body intact. Brace counting is
// enough here: the stylesheet has no strings or comments with stray braces in it.
function stukken(css) {
    const uit = [];
    let i = 0;
    while (i < css.length) {
        const open = css.indexOf('{', i);
        if (open < 0) break;
        let diep = 0, j = open;
        for (; j < css.length; j++) {
            if (css[j] === '{') diep++;
            else if (css[j] === '}' && --diep === 0) break;
        }
        if (j >= css.length) break;
        uit.push({
            selector: css.slice(i, open).trim(),
            body: css.slice(open + 1, j),
            heel: css.slice(i, j + 1).trim()
        });
        i = j + 1;
    }
    return uit;
}

const namen = footerNamen();
const raakt = tekst => namen.some(n => tekst.includes(n));

const css = fs.readFileSync(BRON_CSS, 'utf8');
const gehouden = [];

for (const stuk of stukken(css)) {
    if (stuk.selector.startsWith('@media')) {
        // Keep only the footer rules inside, so the file does not drag in the rest of
        // the page's responsive layout.
        const binnen = stukken(stuk.body).filter(r => raakt(r.selector));
        if (binnen.length) {
            gehouden.push(`${stuk.selector} {\n${binnen.map(r => r.heel).join('\n\n')}\n}`);
        }
    } else if (raakt(stuk.selector)) {
        gehouden.push(stuk.heel);
    }
}

if (!gehouden.length) {
    console.error('nothing matched - has the footer markup or the page CSS changed?');
    process.exit(1);
}

const kop = `/* The footer's Fluid Engine layout, lifted out of assets/css/pages/klachten.css
   by tools/build-footer-css.js. Do not edit by hand: run that tool again instead.

   Converted pages carry these same rules in their own page stylesheet. The pages
   written by hand have no page stylesheet, so without this file the footer loses its
   grid and every block stacks against the left edge. */\n\n`;

const uit = kop + gehouden.join('\n\n') + '\n';

if (process.argv.includes('--check')) {
    const nu = fs.existsSync(UIT) ? fs.readFileSync(UIT, 'utf8') : '';
    console.log(nu === uit
        ? 'assets/css/footer.css is in step'
        : 'assets/css/footer.css would change');
    process.exitCode = nu === uit ? 0 : 1;
} else {
    fs.writeFileSync(UIT, uit);
    console.log(`assets/css/footer.css: ${gehouden.length} rules, `
        + `${Math.round(uit.length / 1024)} kB`);
}
