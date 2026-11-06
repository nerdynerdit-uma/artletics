// Converts the workshop flyers for the web and writes the pages behind
// "Artletics voor Scholen".
//
//   node tools/build-workshops.js                     use the default source folder
//   node tools/build-workshops.js "<folder>"          flyers from somewhere else
//   node tools/build-workshops.js --force             convert again, even if present
//   node tools/build-workshops.js --page-only         just rewrite the HTML
//
// The originals are 1024-1055px PNGs of about 2 MB each. Each one becomes two WebP
// files in assets/images/workshops/: a tile for the grid and a larger one for the
// lightbox. Together they are a fraction of the originals, which stay outside the repo.
//
// Five pages come out of tools/workshops.js: the overview at /workshops/voor-scholen,
// which is what the menu points at, and one gallery per workshop line behind it. Run
// tools/apply-nav.js afterwards if the menu changed.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { LIJNEN, WORKSHOPS, INZETVORMEN } = require('./workshops');
const { buildNav } = require('./nav');

const DEFAULT_BRON = path.join(process.env.USERPROFILE || process.env.HOME || '',
    'Documents/Klanten/Stichting Facts/Artletics/2026',
    'wetransfer_artletics-plus-projectplan-2027-stichting-facts-pdf_2026-11-05_0926');

const UIT_DIR = 'assets/images/workshops';
const PAGINA_DIR = 'workshops';
const OVERZICHT = 'workshops/voor-scholen.html';
const TEGEL_BREED = 700;   // grid tile, enough for a retina screen at display size
const GROOT_BREED = 1100;  // lightbox; the originals are barely wider than this
const KWALITEIT = 80;

const args = process.argv.slice(2);
const force = args.includes('--force');
const alleenPagina = args.includes('--page-only');
const bron = args.find(a => !a.startsWith('--')) || DEFAULT_BRON;

// --- the images -------------------------------------------------------------------

// Every flyer ends in a white band with the Stichting Facts and Youngins logos and
// www.artletics.nl. On the website itself that is stating the obvious, so it is cut
// off: the flyer runs to the row of icons and stops there.
//
// The band is found by reading the flyer as a small grey image and walking up from the
// bottom while the rows stay light. One flyer does not have a straight band — the DJ
// one ends in a diagonal white shape — so its cut is given here by hand.
const VOET_HANDMATIG = {
    'Mix-It-Up-DJ-Workshop-Artletics-flyer.jpeg': 0.155
};
const VOET_MIN = 0.02;   // below this there is no band to speak of
const VOET_MAX = 0.14;   // above this something else is going on; leave the flyer be

function witteVoet(bestand) {
    const handmatig = VOET_HANDMATIG[path.basename(bestand)];
    if (handmatig !== undefined) return handmatig;

    const breed = 32;
    const hoog = 500;
    const ruw = execFileSync(ffmpeg, [
        '-v', 'error', '-i', bestand,
        '-vf', `scale=${breed}:${hoog}:flags=area,format=gray`,
        '-f', 'rawvideo', '-'
    ], { maxBuffer: 1 << 26 });

    let y = hoog - 1;
    while (y >= 0) {
        let som = 0;
        for (let x = 0; x < breed; x++) som += ruw[y * breed + x];
        // 165, not something closer to white: the logos sitting in the band pull a
        // row's average well down, and stopping at the first of those would leave
        // most of the band on the flyer.
        if (som / breed < 165) break;
        y--;
    }
    const fractie = (hoog - 1 - y) / hoog;
    return fractie >= VOET_MIN && fractie <= VOET_MAX ? fractie : 0;
}

function webp(van, naar, breedte, voet) {
    const snijden = voet > 0
        ? `crop=iw:floor(ih*${(1 - voet).toFixed(4)}/2)*2:0:0,`
        : '';
    execFileSync(ffmpeg, [
        '-y', '-loglevel', 'error',
        '-i', van,
        '-vf', `${snijden}scale=${breedte}:-2:flags=lanczos`,
        '-quality', String(KWALITEIT),
        '-compression_level', '6',
        naar
    ]);
}

function kb(file) {
    return Math.round(fs.statSync(file).size / 1024);
}

const plaatjes = new Map(); // workshop slug -> [{ tegel, groot }]
let gemaakt = 0;
let overgeslagen = 0;
const ontbreekt = [];

if (!alleenPagina) {
    if (!fs.existsSync(bron)) {
        console.error(`source folder not found:\n  ${bron}`);
        console.error('Pass the folder with the flyers as an argument.');
        process.exit(1);
    }
    fs.mkdirSync(UIT_DIR, { recursive: true });
}

for (const workshop of WORKSHOPS) {
    const lijst = [];
    workshop.flyers.forEach((flyer, i) => {
        const naam = `${workshop.slug}-${i + 1}`;
        const tegel = path.join(UIT_DIR, `${naam}-tegel.webp`);
        const groot = path.join(UIT_DIR, `${naam}.webp`);
        lijst.push({ tegel: '/' + tegel.replace(/\\/g, '/'), groot: '/' + groot.replace(/\\/g, '/') });

        if (alleenPagina) return;
        const van = path.join(bron, flyer);
        if (!fs.existsSync(van)) {
            ontbreekt.push(flyer);
            return;
        }
        if (!force && fs.existsSync(tegel) && fs.existsSync(groot)) {
            overgeslagen++;
            return;
        }
        const voet = witteVoet(van);
        webp(van, tegel, TEGEL_BREED, voet);
        webp(van, groot, GROOT_BREED, voet);
        gemaakt++;
        console.log(`  ${naam.padEnd(20)} ${String(kb(tegel)).padStart(4)} KB tile, `
            + `${String(kb(groot)).padStart(4)} KB large, `
            + `voet ${(voet * 100).toFixed(1).padStart(4)}%   <- ${flyer}`);
    });
    plaatjes.set(workshop.slug, lijst);
}

if (ontbreekt.length) {
    console.log('\nnot found in the source folder:');
    ontbreekt.forEach(f => console.log('  -', f));
}

// --- the pages ---------------------------------------------------------------------
function stamp(file) {
    if (!fs.existsSync(file)) return `/${file}`;
    const hash = require('crypto').createHash('md5')
        .update(fs.readFileSync(file)).digest('hex').slice(0, 8);
    return `/${file}?v=${hash}`;
}

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// The line titles carry a literal "&amp;" of their own, so they are already escaped.
function ontEsc(s) {
    return String(s).replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
}

const footerBron = fs.existsSync('klachten.html')
    ? fs.readFileSync('klachten.html', 'utf8').match(/<footer class="site-footer">[\s\S]*?<\/footer>/)
    : null;
const footer = footerBron ? footerBron[0] : '<footer class="site-footer"></footer>';

const LIGHTBOX = `<div class="flyer-venster" id="flyerVenster" hidden role="dialog" aria-modal="true"
  aria-label="Flyer">
  <button type="button" class="flyer-sluit" aria-label="Sluiten">&times;</button>
  <button type="button" class="flyer-vorige" aria-label="Vorige">&#8249;</button>
  <figure class="flyer-groot">
    <img id="flyerBeeld" src="" alt="">
    <figcaption id="flyerBijschrift"></figcaption>
  </figure>
  <button type="button" class="flyer-volgende" aria-label="Volgende">&#8250;</button>
</div>`;

const TITEL_STAART = 'Artletics &bull; Workshops in sport, cultuur en creativiteit '
    + '&mdash; &ldquo;Waar kunst, sport en jongerenkracht samenkomen&rdquo;';

// One page skeleton for all five pages. `lightbox` is left out on the overview, which
// has nothing to enlarge.
function pagina({ titel, omschrijving, inhoud, lightbox = true }) {
    return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titel} &mdash; ${TITEL_STAART}</title>
<meta name="description" content="${esc(omschrijving)}">
<link rel="icon" href="/assets/images/5f1b031b-favicon.webp" type="image/webp">
<link rel="stylesheet" href="${stamp('assets/css/base.css')}">
<link rel="stylesheet" href="${stamp('assets/css/plain-pages.css')}">
<link rel="stylesheet" href="${stamp('assets/css/overrides.css')}">
</head>
<body>
${buildNav('black')}
<main id="page">
  <section class="page-section theme-black plain-page valign-top">
${inhoud}
  </section>
</main>

${lightbox ? LIGHTBOX + '\n\n' : ''}${footer}
<script src="${stamp('assets/js/site.js')}" defer></script>
${lightbox ? `<script src="${stamp('assets/js/flyers.js')}" defer></script>\n` : ''}</body>
</html>
`;
}

// The flyer grid, as it has always been: one tile per workshop, every version of a
// flyer behind it in the lightbox.
function flyerRaster(lijst) {
    return lijst.map(w => {
        const beelden = plaatjes.get(w.slug);
        const data = beelden.map(b => b.groot).join('|');
        // How many flyers sit behind this tile. It used to sit in the corner of the
        // artwork, which was fine while the flyers ended in a white band; now that the
        // band is cropped off it would cover a label, so it sits beside the heading.
        const extra = beelden.length > 1
            ? ` <span class="flyer-aantal">${beelden.length} versies</span>`
            : '';
        return `      <li class="flyer-tegel">
        <button type="button" class="flyer-knop" data-flyers="${esc(data)}"
          data-titel="${esc(w.titel)}" aria-haspopup="dialog">
          <img src="${beelden[0].tegel}" alt="Flyer van de ${esc(w.titel.toLowerCase())}: ${esc(w.naam)}"
            loading="lazy">
        </button>
        <h3>${esc(w.titel)}${extra}</h3>
        <p>${esc(w.omschrijving)}</p>
      </li>`;
    }).join('\n');
}

// Spell the number out, so a page never says "Twaalf" while the catalogue holds
// fourteen.
const TELWOORDEN = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht',
    'negen', 'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien',
    'zeventien', 'achttien', 'negentien', 'twintig'];
const telwoord = n => TELWOORDEN[n] || String(n);
const hoofdletter = s => s.charAt(0).toUpperCase() + s.slice(1);

const perLijn = new Map(LIJNEN.map(l => [l.slug, WORKSHOPS.filter(w => w.lijn === l.slug)]));
const zonderLijn = WORKSHOPS.filter(w => !perLijn.has(w.lijn));
if (zonderLijn.length) {
    console.error('workshops with an unknown lijn: '
        + zonderLijn.map(w => `${w.slug} -> ${w.lijn}`).join(', '));
    process.exit(1);
}

const geschreven = [];
function schrijf(bestand, html) {
    fs.mkdirSync(path.dirname(bestand), { recursive: true });
    fs.writeFileSync(bestand, html);
    geschreven.push(bestand);
}

// --- the overview, which is what the menu points at ---------------------------------

// Each line gets a block the size of a poster: the first few flyers behind it as a
// preview strip, then the name and what it covers. That strip is why the page is worth
// a click: you see the gallery before you open it.
const lijnMenu = LIJNEN.map(lijn => {
    const lijst = perLijn.get(lijn.slug);
    const strook = lijst.slice(0, 4).map(w =>
        `          <img src="${plaatjes.get(w.slug)[0].tegel}" alt="" loading="lazy">`).join('\n');
    const namen = lijst.map(w => esc(w.naam)).join(' &middot; ');
    return `      <li class="lijn-tegel" style="--lijn: ${lijn.kleur}">
        <a class="lijn-knop" href="/workshops/${lijn.slug}">
          <span class="lijn-beelden" aria-hidden="true">
${strook}
          </span>
          <span class="lijn-nummer">Workshoplijn ${lijn.nummer}</span>
          <span class="lijn-titel">${lijn.titel}</span>
          <span class="lijn-omschrijving">${lijn.omschrijving}</span>
          <span class="lijn-namen">${namen}</span>
          <span class="lijn-meer">${lijst.length} workshops bekijken &rarr;</span>
        </a>
      </li>`;
}).join('\n');

const inzet = INZETVORMEN.map(v => `      <li>
        <h3>${esc(v.titel)}</h3>
        <p>${esc(v.tekst)}</p>
      </li>`).join('\n');

const lijnNamen = LIJNEN.map(l => ontEsc(l.plat).toLowerCase()).join(', ');

schrijf(OVERZICHT, pagina({
    titel: 'Artletics voor Scholen',
    omschrijving: `Het workshopaanbod van Artletics voor scholen in vier lijnen: `
        + `${lijnNamen}. Kies een lijn en bekijk de workshops en hun flyers.`,
    lightbox: false,
    inhoud: `    <p class="plain-eyebrow">Workshops</p>
    <h1>Artletics voor Scholen</h1>
    <p class="plain-lead">${hoofdletter(telwoord(WORKSHOPS.length))} workshops in sport,
    cultuur, media en creativiteit, verdeeld over vier workshoplijnen. Los af te nemen
    of gecombineerd tot een lessenreeks, schooltraject, wijkprogramma of Impactweek.
    Kies een lijn om de workshops en hun flyers te bekijken.</p>
    <hr class="plain-rule">

    <ul class="lijn-menu">
${lijnMenu}
    </ul>

    <h2>Vier inzetvormen</h2>
    <p>Hetzelfde aanbod, in de vorm die bij de groep en de periode past. Alle
    programma&rsquo;s worden afgestemd op leeftijd, groepsgrootte, locatie en de doelen
    van de school.</p>
    <ul class="plain-cards">
${inzet}
    </ul>

    <h2>Een workshop aanvragen</h2>
    <p>Vertel kort om welke groep het gaat, welke doelen je hebt en in welke periode je
    het wilt uitvoeren. Daarna maken we een voorstel op maat.</p>
    <a class="plain-cta" href="/contact">Vraag een voorstel aan</a>`
}));

// --- one gallery page per line ------------------------------------------------------
for (const lijn of LIJNEN) {
    const lijst = perLijn.get(lijn.slug);
    const anderen = LIJNEN.filter(l => l.slug !== lijn.slug).map(l =>
        `      <li style="--lijn: ${l.kleur}">
        <a href="/workshops/${l.slug}"><span>Workshoplijn ${l.nummer}</span>${l.titel}</a>
      </li>`).join('\n');

    schrijf(path.join(PAGINA_DIR, `${lijn.slug}.html`), pagina({
        titel: `${lijn.titel} &mdash; Artletics voor Scholen`,
        omschrijving: `Workshoplijn ${lijn.nummer} van Artletics voor scholen, `
            + `${ontEsc(lijn.plat).toLowerCase()}: `
            + `${lijst.map(w => ontEsc(w.naam)).join(', ')}. Bekijk de flyer van elke workshop.`,
        inhoud: `    <p class="plain-eyebrow"><a href="/workshops/voor-scholen">&#8249;
    Artletics voor Scholen</a></p>
    <h1>${lijn.titel}</h1>
    <p class="plain-lead">${lijn.omschrijving}</p>
    <hr class="plain-rule" style="--lijn: ${lijn.kleur}">

    <ul class="flyer-raster">
${flyerRaster(lijst)}
    </ul>

    <h2>De andere workshoplijnen</h2>
    <ul class="lijn-rij">
${anderen}
    </ul>

    <h2>Een workshop aanvragen</h2>
    <p>Vertel kort om welke groep het gaat, welke doelen je hebt en in welke periode je
    het wilt uitvoeren. Daarna maken we een voorstel op maat.</p>
    <a class="plain-cta" href="/contact">Vraag een voorstel aan</a>`
    }));
}

console.log('');
geschreven.forEach(f => console.log('  ' + f.replace(/\\/g, '/')));
console.log(`${WORKSHOPS.length} workshops in ${LIJNEN.length} lijnen, `
    + `${[...plaatjes.values()].reduce((n, l) => n + l.length, 0)} flyers`);
if (!alleenPagina) {
    console.log(`${gemaakt} converted, ${overgeslagen} already there`
        + (force ? '' : ' (--force to redo)'));
}
