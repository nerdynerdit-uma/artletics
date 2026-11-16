// Writes sitemap.xml and robots.txt from the pages that are actually on disk.
//
//   node tools/build-sitemap.js            write both files
//   node tools/build-sitemap.js --check    only report what would change
//
// Generated rather than typed, for the same reason the menu is: a page added by
// tools/convert.js or tools/build-workshops.js has to turn up here without anyone
// remembering to add it. Run it after those two, together with tools/apply-nav.js.
//
// The addresses are the ones a visitor sees: vercel.json sets cleanUrls, so the file
// galerij/week-2.html is served at /galerij/week-2, and index.html is the bare domain.
// Addresses that only redirect are deliberately absent -- vercel.json keeps those, and
// a sitemap is for the pages themselves, not for the signposts to them.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.artletics.nl';
const SKIP_DIRS = new Set(['_raw', 'node_modules', '.git', '.next', 'tools', 'api', 'assets']);

const check = process.argv.includes('--check');

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

// index.html is the home page; everything else drops the extension.
function address(bestand) {
    const rel = path.relative(ROOT, bestand).split(path.sep).join('/');
    if (rel === 'index.html') return '/';
    return '/' + rel.replace(/\.html$/, '');
}

// The date of the last commit that touched the file. A file that git does not know
// yet (a page written but not committed) falls back to its date on disk, so the
// sitemap is never missing a lastmod.
function laatstGewijzigd(bestand) {
    try {
        const uit = execFileSync('git', ['log', '-1', '--format=%cs', '--', bestand],
            { cwd: ROOT, encoding: 'utf8' }).trim();
        if (uit) return uit;
    } catch (fout) {
        // geen git, of het bestand staat er nog niet in
    }
    return fs.statSync(bestand).mtime.toISOString().slice(0, 10);
}

const regels = pages()
    .map(bestand => ({ url: address(bestand), datum: laatstGewijzigd(bestand) }))
    // De voorpagina eerst, de rest op alfabet, zodat het bestand leesbaar blijft en
    // twee keer draaien dezelfde volgorde geeft.
    .sort((a, b) => (a.url === '/' ? -1 : b.url === '/' ? 1 : a.url.localeCompare(b.url)));

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + regels.map(r => `  <url>\n    <loc>${SITE}${r.url}</loc>\n`
        + `    <lastmod>${r.datum}</lastmod>\n  </url>\n`).join('')
    + '</urlset>\n';

// /api/ answers only POST, so a crawler there gets a 405 and nothing else. Keeping it
// out spares both sides the request.
const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    ''
].join('\n');

let gewijzigd = 0;
for (const [naam, inhoud] of [['sitemap.xml', sitemap], ['robots.txt', robots]]) {
    const pad = path.join(ROOT, naam);
    const oud = fs.existsSync(pad) ? fs.readFileSync(pad, 'utf8') : null;
    if (oud === inhoud) {
        console.log(`  ${naam} is al bij`);
        continue;
    }
    gewijzigd++;
    if (check) {
        console.log(`  ${naam} zou veranderen`);
    } else {
        fs.writeFileSync(pad, inhoud);
        console.log(`  ${naam} geschreven`);
    }
}

console.log(`\n${regels.length} pagina's in de sitemap`
    + (check && gewijzigd ? `, ${gewijzigd} bestand(en) lopen achter` : ''));
if (check && gewijzigd) process.exit(1);
