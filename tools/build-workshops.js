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
const { FEITEN, FEITEN_NOOT, LESVORMEN, DETAILS } = require('./workshop-detail');
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
<link rel="stylesheet" href="${stamp('assets/css/footer.css')}">
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

// The small icons beside the practical details above the two lesson forms. These are
// the site's own, not the poster's: the four icons on a poster are cut out of the
// artwork itself (see ICOONBAND below), because the client asked for exactly those.
const svg = inhoud => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" `
    + `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" `
    + `aria-hidden="true" focusable="false">${inhoud}</svg>`;

const ICONEN = {
    // calendar - lesdagen
    kalender: svg('<rect x="3.4" y="5.2" width="17.2" height="15.4" rx="2"/>'
        + '<path d="M8 3.4V7M16 3.4V7M3.4 10h17.2"/>'),
    // clock - lestijden
    klok: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/>'),
    // calendar with a tick - aantal sessies
    kalendervink: svg('<rect x="3.4" y="5.2" width="17.2" height="15.4" rx="2"/>'
        + '<path d="M8 3.4V7M16 3.4V7M3.4 10h17.2"/>'
        + '<path d="M8.8 14.8l2.2 2.2 4.2-4.2"/>'),
    // hourglass - lesduur
    zandloper: svg('<path d="M6.5 3.4h11M6.5 20.6h11"/>'
        + '<path d="M7.6 3.4c0 4.6 4.4 5.6 4.4 8.6 0 3-4.4 4-4.4 8.6"/>'
        + '<path d="M16.4 3.4c0 4.6-4.4 5.6-4.4 8.6 0 3 4.4 4 4.4 8.6"/>'),
    // stacked layers - the hours added up
    stapel: svg('<path d="M12 3.4 3 8l9 4.6L21 8l-9-4.6Z"/><path d="M3 12.4 12 17l9-4.6"/>'
        + '<path d="M3 16.6 12 21.2l9-4.6"/>'),
    // two arrows round - frequentie
    herhaal: svg('<path d="M4.1 11.2a8 8 0 0 1 13-6.1l2.5 2.2"/>'
        + '<path d="M19.9 12.8a8 8 0 0 1-13 6.1l-2.5-2.2"/>'
        + '<path d="M19.9 3.4v3.9H16"/><path d="M4.1 20.6v-3.9H8"/>')
};

// --- the four icons on a poster ------------------------------------------------------
//
// The client asked for the icons along the foot of a poster to be repeated exactly in
// the explanation, so they are cut out of the artwork rather than redrawn. Where the
// strip sits is measured off each poster with a grid, as a fraction of the cropped
// flyer; the pixel values behind those fractions, in the 1000-wide space the analysis
// works in, are in the comments.
//
// The sides of the band are forgiving - the exact box is found inside it - but the
// bottom edge is not. On several posters the label begins one single row under the
// icon, with no gap to find, and this edge is the only thing keeping the two apart.
// Whoever changes witteVoet() changes the crop, and then these have to be measured
// again; the build fails loudly rather than quietly cutting the wrong thing.
const ICOON_DIR = 'assets/images/workshops/iconen';
const ICOON_BREED = 1000;

const ICOONBAND = {
    design:      { y0: 1124 / 1310, y1: 1238 / 1310, x0: 0 },     // 1124-1238
    graffiti:    { y0: 1116 / 1314, y1: 1232 / 1314, x0: 0 },     // 1116-1232
    schilder:    { y0: 1065 / 1282, y1: 1167 / 1282, x0: 0.5 },   // 1065-1167, right half
    kapper:      { y0: 1134 / 1314, y1: 1238 / 1314, x0: 0 },     // 1134-1238
    hairstyling: { y0: 1120 / 1310, y1: 1237 / 1310, x0: 0 }      // 1120-1237
};

// Ink is anything that is not the black the strip sits on: a light stroke, or a
// saturated colour such as the orange and purple rings.
function isInkt(buf, i) {
    const r = buf[i], g = buf[i + 1], b = buf[i + 2];
    return 0.299 * r + 0.587 * g + 0.114 * b > 100
        || Math.max(r, g, b) - Math.min(r, g, b) > 70;
}

// Runs of true, allowing a small gap inside one run.
function runs(actief, gatMax, minLengte) {
    const uit = [];
    let start = -1, gat = 0;
    for (let i = 0; i <= actief.length; i++) {
        if (i < actief.length && actief[i]) {
            if (start < 0) start = i;
            gat = 0;
        } else if (start >= 0 && (++gat > gatMax || i === actief.length)) {
            const eind = i - gat;
            if (eind - start + 1 >= minLengte) uit.push([start, eind]);
            start = -1;
            gat = 0;
        }
    }
    return uit;
}

function icoonVakken(bestand, band) {
    const buf = execFileSync(ffmpeg, ['-v', 'error', '-i', bestand,
        '-vf', `scale=${ICOON_BREED}:-2:flags=area,format=rgb24`, '-f', 'rawvideo', '-'],
        { maxBuffer: 1 << 28 });
    const hoog = buf.length / (ICOON_BREED * 3);
    const yVan = Math.round(band.y0 * hoog);
    const yTot = Math.round(band.y1 * hoog);
    const xVan = Math.round(band.x0 * ICOON_BREED);
    const bandHoog = yTot - yVan;

    // Columns. A hairline divider runs the whole height of the band and is not an
    // icon, so a column inked nearly all the way down is left out.
    const kol = new Array(ICOON_BREED).fill(0);
    for (let y = yVan; y < yTot; y++) {
        for (let x = xVan; x < ICOON_BREED; x++) {
            if (isInkt(buf, (y * ICOON_BREED + x) * 3)) kol[x]++;
        }
    }
    const actief = kol.map(v => v > bandHoog * 0.04 && v < bandHoog * 0.9);

    return runs(actief, 10, 28)
        .map(([x0, x1]) => ({ x0, x1, breed: x1 - x0 + 1 }))
        .sort((a, b) => b.breed - a.breed)
        .slice(0, 4)
        .sort((a, b) => a.x0 - b.x0)
        .map(v => {
            let y0 = yTot - 1, y1 = yVan;
            for (let y = yVan; y < yTot; y++) {
                let n = 0;
                for (let x = v.x0; x <= v.x1; x++) {
                    if (isInkt(buf, (y * ICOON_BREED + x) * 3)) n++;
                }
                if (n > v.breed * 0.04) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
            }
            // Two pixels of air, but never outside the band: on one poster the last
            // line of the paragraph sits two rows above the first ring.
            const marge = 2;
            return {
                x: Math.max(0, v.x0 - marge) / ICOON_BREED,
                y: Math.max(yVan, y0 - marge) / hoog,
                w: (Math.min(ICOON_BREED - 1, v.x1 + marge) - Math.max(0, v.x0 - marge) + 1)
                    / ICOON_BREED,
                h: (Math.min(yTot - 1, Math.max(y1, y0) + marge) - Math.max(yVan, y0 - marge) + 1)
                    / hoog
            };
        });
}

// Writes assets/images/workshops/iconen/<slug>-<n>.webp and returns the paths.
function snijIconen(slug, bron) {
    const band = ICOONBAND[slug];
    if (!band) return null;

    const wil = DETAILS[slug].iconen.length;
    const paden = [];
    for (let i = 1; i <= wil; i++) paden.push(`/${ICOON_DIR}/${slug}-${i}.webp`);

    const klaar = paden.every(p => fs.existsSync(p.slice(1)));
    if (klaar && !force) return paden;

    const vakken = icoonVakken(bron, band);
    if (vakken.length !== wil) {
        console.error(`${slug}: found ${vakken.length} icons on the poster, `
            + `but tools/workshop-detail.js describes ${wil}. The band in ICOONBAND `
            + `no longer matches the artwork.`);
        process.exit(1);
    }

    fs.mkdirSync(ICOON_DIR, { recursive: true });
    vakken.forEach((v, i) => {
        execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', bron,
            '-vf', `crop=iw*${v.w.toFixed(6)}:ih*${v.h.toFixed(6)}:`
                 + `iw*${v.x.toFixed(6)}:ih*${v.y.toFixed(6)}`,
            '-quality', '88', '-compression_level', '6',
            path.join(ICOON_DIR, `${slug}-${i + 1}.webp`)]);
    });
    console.log(`  ${slug}: ${vakken.length} icons cut out of the poster`);
    return paden;
}

// The flyer grid: one tile per workshop, with every version of the flyer behind it.
//
// A workshop that has an entry in DETAILS has a page of its own, and then the poster
// is a link to that page rather than a button that enlarges it — the client asked for
// the poster to lead somewhere. The flyer can still be seen full size, in the lightbox
// on that page. Workshops without a page keep the old behaviour, so the galleries of
// the other three lines are unchanged.
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
        const alt = `Flyer van de ${esc(w.titel.toLowerCase())}: ${esc(w.naam)}`;
        const beeld = `          <img src="${beelden[0].tegel}" alt="${alt}" loading="lazy">`;
        const detail = DETAILS[w.slug];

        if (detail) {
            return `      <li class="flyer-tegel">
        <a class="flyer-knop" href="/workshops/${detail.pad}">
${beeld}
        </a>
        <h3><a href="/workshops/${detail.pad}">${esc(w.titel)}</a>${extra}</h3>
        <p>${esc(w.omschrijving)}</p>
        <p class="flyer-meer"><a href="/workshops/${detail.pad}">Bekijk de workshop &rarr;</a></p>
      </li>`;
        }

        return `      <li class="flyer-tegel">
        <button type="button" class="flyer-knop" data-flyers="${esc(data)}"
          data-titel="${esc(w.titel)}" aria-haspopup="dialog">
${beeld}
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

    // Once every tile in a line leads to a page of its own, nothing on the page can be
    // enlarged any more, and the empty dialog would only sit there unused.
    const heeftLightbox = lijst.some(w => !DETAILS[w.slug]);

    schrijf(path.join(PAGINA_DIR, `${lijn.slug}.html`), pagina({
        lightbox: heeftLightbox,
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

// --- one page per poster ------------------------------------------------------------
//
// Only for the workshops that have an entry in tools/workshop-detail.js. The rest keep
// a tile that enlarges the flyer, until their copy is written too.

const lijnVan = new Map(LIJNEN.map(l => [l.slug, l]));

// What both ways of joining have in common, as labelled blocks. Built per line so the
// icons and the rules take that line's colour.
function feitenBlok(kleur) {
    const ontbreekt = FEITEN.filter(f => !ICONEN[f.icoon]);
    if (ontbreekt.length) {
        console.error('no drawing for ' + ontbreekt.map(f => f.icoon).join(', '));
        process.exit(1);
    }
    // Without a colour the CSS falls back on the site's red accent, which is what the
    // Aanbod page wants: it belongs to no single workshop line.
    const kleuren = kleur ? ` style="--lijn: ${kleur}"` : '';
    return FEITEN.map(f => `      <li${kleuren}>
        <span class="feit-icoon">${ICONEN[f.icoon]}</span>
        <span class="feit-label">${esc(f.label)}</span>
        <span class="feit-waarde">${esc(f.waarde)}</span>
      </li>`).join('\n');
}

// The two ways to join, the same on every workshop page. The client's own wording.
const lesvormen = LESVORMEN.map(v => `      <li>
        <h3>${esc(v.naam)}</h3>
        <p class="lesvorm-slogan">${esc(v.slogan)}</p>
        <p>${esc(v.tekst)}</p>
        <ul class="plain-lijst">
${v.punten.map(p => `          <li>${esc(p)}</li>`).join('\n')}
        </ul>
        <p class="lesvorm-prijs"><strong>${esc(v.prijs)}</strong>
        <span>${esc(v.prijsWat)}</span></p>
      </li>`).join('\n');

for (const w of WORKSHOPS) {
    const d = DETAILS[w.slug];
    if (!d) continue;

    const lijn = lijnVan.get(w.lijn);
    const beelden = plaatjes.get(w.slug);
    const data = beelden.map(b => b.groot).join('|');
    // No caption telling people the poster enlarges - the client asked for that line
    // to go. A workshop with several posters still says so, because that is not
    // otherwise visible.
    const meer = beelden.length > 1
        ? `\n        <figcaption>Er zijn ${telwoord(beelden.length)} versies van `
          + `deze poster.</figcaption>`
        : '';

    // The icons are the poster's own, cut out of it. The label beside each one names
    // it, so the image itself carries no alt text.
    const icoonPaden = snijIconen(w.slug, beelden[0].groot.slice(1));
    if (!icoonPaden) {
        console.error(`${w.slug}: no entry in ICOONBAND, so its icons cannot be cut `
            + `out of the poster.`);
        process.exit(1);
    }

    const iconen = d.iconen.map((i, n) => `      <li>
        <span class="ws-icoon"><img src="${icoonPaden[n]}" alt="" loading="lazy"></span>
        <div>
          <h3>${esc(i.label)}</h3>
          <p>${esc(i.uitleg)}</p>
        </div>
      </li>`).join('\n');

    // The other workshops in the same line that have a page of their own to go to.
    const buren = WORKSHOPS
        .filter(a => a.lijn === w.lijn && a.slug !== w.slug && DETAILS[a.slug])
        .map(a => `      <li style="--lijn: ${lijn.kleur}">
        <a href="/workshops/${DETAILS[a.slug].pad}"><span>${esc(a.titel)}</span>${esc(a.naam)}</a>
      </li>`).join('\n');

    const burenBlok = buren ? `
    <h2>De andere workshops in deze lijn</h2>
    <ul class="lijn-rij">
${buren}
    </ul>
` : '';

    schrijf(path.join(PAGINA_DIR, `${d.pad}.html`), pagina({
        titel: `${esc(w.naam)} &mdash; ${esc(w.titel)}`,
        omschrijving: `${w.naam}, de ${w.titel.toLowerCase()} van Artletics. `
            + `${d.iconen.map(i => i.label).join(', ')}. `
            + `Mee te doen in groepslessen of in een Small Group van maximaal drie deelnemers.`,
        inhoud: `    <p class="plain-eyebrow"><a href="/workshops/${lijn.slug}">&#8249;
    ${lijn.titel}</a></p>
    <h1>${esc(w.naam)}</h1>
    <p class="plain-lead">${esc(w.titel)} &middot; ${esc(d.kreet)}</p>
    <hr class="plain-rule" style="--lijn: ${lijn.kleur}">

    <div class="ws-top">
      <figure class="ws-poster">
        <button type="button" class="flyer-knop" data-flyers="${esc(data)}"
          data-titel="${esc(w.titel)}" aria-haspopup="dialog">
          <img src="${beelden[0].tegel}" alt="Poster van ${esc(w.naam)}, de ${esc(w.titel.toLowerCase())} van Artletics">
        </button>${meer}
      </figure>
      <div class="ws-intro">
        <h2>${esc(d.kop)}</h2>
        <p>${esc(d.intro)}</p>
      </div>
    </div>

    <h2>Wat de vier iconen op de poster betekenen</h2>
    <p>Onderaan de poster staan vier iconen. Samen vertellen ze waar deze workshop uit
    bestaat. Dit is wat er achter zit.</p>
    <ul class="ws-iconen">
${iconen}
    </ul>

    <h2>Zo kun je meedoen</h2>
    <p>Bij Artletics kun je kiezen uit twee lesvormen. Dit geldt voor allebei:</p>
    <ul class="feiten">
${feitenBlok(lijn.kleur)}
    </ul>
    <p class="feiten-noot" style="--lijn: ${lijn.kleur}">
      <strong>${esc(FEITEN_NOOT.label)}</strong>
      ${esc(FEITEN_NOOT.tekst)}
    </p>
    <ul class="lesvormen">
${lesvormen}
    </ul>
    <a class="plain-cta" href="/aanmelden">Direct aanmelden</a>
${burenBlok}
    <h2>Met een hele klas of groep?</h2>
    <p>Deze workshop is ook los af te nemen door een school, gemeente of wijkpartner, als
    kennismaking, lessenreeks of onderdeel van een Impactweek. Kijk bij
    <a href="/workshops/voor-scholen">Artletics voor Scholen</a> of
    <a href="/contact">vraag een voorstel op maat aan</a>.</p>`
    }));
}

// --- /aanbod, the whole offer on one page --------------------------------------------
//
// Aanbod used to be a folder in the menu with two pages behind it that were never
// filled in. The client asked for one page instead, after the equivalent on
// stichtingmaeh.nl: an overview that groups everything and hands you on to the page
// that has the detail. It is written here rather than by hand because almost all of
// it is already in tools/workshops.js and tools/workshop-detail.js - the lines, the
// ways of taking part, the prices - and that should not be typed out a second time.

// The four disciplines the site has always been built around. Each page opens with a
// coloured brand tile; those are the card images here, scaled down from the originals,
// which are up to half a megabyte each.
const DISCIPLINES = [
    {
        naam: 'Creatieve Artwork', pad: '/creatieve-artwork',
        bron: 'assets/images/5f5e2032-Untitled-design.webp',
        wat: 'Ontwerpen, schilderen en spuiten: van een eerste schets naar iets dat af is.'
    },
    {
        naam: 'Dans', pad: '/dans',
        bron: 'assets/images/929f5739-Untitled-design-3-.webp',
        wat: 'Ritme, choreografie en je eigen manier van bewegen vinden.'
    },
    {
        naam: 'Muziek', pad: '/muziek',
        bron: 'assets/images/3bd1f205-Untitled-design-5-.webp',
        wat: 'Beats en teksten maken, en draaien achter echte apparatuur.'
    },
    {
        naam: 'Voetbal', pad: '/voetbal',
        bron: 'assets/images/4b12f614-Untitled-design-7-.webp',
        wat: 'Techniek, conditie en samenspel in een groep waar je iets aan hebt.'
    }
];

const AANBOD_DIR = 'assets/images/aanbod';
const DISCIPLINE_BREED = 640;

const disciplineBeeld = d => {
    const uit = path.join(AANBOD_DIR, path.basename(d.bron));
    if (!fs.existsSync(uit) || force) {
        if (!fs.existsSync(d.bron)) {
            console.error(`aanbod: ${d.bron} is not there`);
            process.exit(1);
        }
        fs.mkdirSync(AANBOD_DIR, { recursive: true });
        webp(d.bron, uit, DISCIPLINE_BREED, 0);
        console.log(`  aanbod: ${path.basename(uit)} (${kb(d.bron)} -> ${kb(uit)} kB)`);
    }
    return '/' + uit.replace(/\\/g, '/');
};

// The three places Artletics works. The colour is the workshop line each leans on
// most, so the page keeps the catalogue's own palette.
const PROGRAMMAS = [
    {
        kop: 'Voor scholen', titel: 'Artletics voor Scholen', kleur: '#ff7900',
        pad: '/workshops/voor-scholen', knop: 'Bekijk het workshopaanbod',
        tekst: `${hoofdletter(telwoord(WORKSHOPS.length))} workshops in vier lijnen, voor `
            + 'groep 7 en 8, voortgezet onderwijs, praktijkonderwijs en mbo. Los af te '
            + 'nemen of samen te stellen tot een lessenreeks, schooltraject of Impactweek.',
        chips: LIJNEN.map(l => l.titel)
    },
    {
        kop: 'Voor gemeenten en wijkpartners', titel: 'Artletics in de Wijk',
        kleur: '#16b8bd', pad: '/workshops/in-de-wijk', knop: 'Bekijk Artletics in de Wijk',
        tekst: 'Dezelfde vier workshoplijnen als op school, maar dan op een plek in de '
            + 'wijk: naschools, in de vakantie of als Impactweek. Bedoeld om jongeren te '
            + 'bereiken die je via school niet te pakken krijgt.',
        chips: ['Naschools aanbod', 'Vakantieprogramma', 'Impactweek', 'Wijkroute']
    },
    {
        // Artletics+ is the programme for older people, not for the young. Getting
        // this wrong on an overview page is exactly the kind of thing a reader acts
        // on, so the wording follows workshops/artletics-plus.html, which is the
        // client's own project plan.
        kop: 'Voor 60-plussers', titel: 'Artletics Plus', kleur: '#7a27d8',
        pad: '/workshops/artletics-plus', knop: 'Bekijk Artletics Plus',
        tekst: 'De oudereneditie van Artletics: zestien weken kunst, cultuur en bewegen '
            + 'in kleine, vaste groepen. De begeleiders en de materialen komen naar de '
            + 'woonzorglocatie toe, ook voor wie minder mobiel is of nog nooit iets '
            + 'dergelijks heeft gedaan.',
        chips: ['Power Up', 'Move It', 'Create Your Sound', 'Design It']
    }
];

const programmaBlokken = PROGRAMMAS.map(p => `      <li style="--lijn: ${p.kleur}">
        <span class="aanbod-kop">${esc(p.kop)}</span>
        <h3>${p.titel}</h3>
        <p>${esc(p.tekst)}</p>
        <ul class="aanbod-chips">
${p.chips.map(c => `          <li>${c}</li>`).join('\n')}
        </ul>
        <a class="aanbod-meer" href="${p.pad}">${esc(p.knop)} &rarr;</a>
      </li>`).join('\n');

const disciplineKaarten = DISCIPLINES.map(d => `      <li>
        <a href="${d.pad}">
          <img src="${disciplineBeeld(d)}" alt="" loading="lazy">
          <span class="discipline-naam">${esc(d.naam)}</span>
          <span class="discipline-wat">${esc(d.wat)}</span>
        </a>
      </li>`).join('\n');

const lijnRij = LIJNEN.map(l => `      <li style="--lijn: ${l.kleur}">
        <a href="/workshops/${l.slug}"><span>Workshoplijn ${l.nummer}</span>${l.titel}</a>
      </li>`).join('\n');

// Kept from the two pages this one replaces: the only part of them that was written
// rather than borrowed from the homepage.
const VERWACHTEN = [
    {
        titel: 'Ontdekken door te doen',
        tekst: 'Geen theorie vooraf. Deelnemers gaan meteen aan de slag en merken zelf '
            + 'waar hun interesse en talent liggen.'
    },
    {
        titel: 'Begeleiding uit de praktijk',
        tekst: 'De workshops worden gegeven door ervaren professionals: makers, '
            + 'trainers, dj&rsquo;s, kunstenaars en sporters.'
    },
    {
        titel: 'Een podium aan het eind',
        tekst: 'Een traject kan worden afgesloten met een presentatie, showcase of '
            + 'gezamenlijk eindevent.'
    }
];

const verwachten = VERWACHTEN.map(v => `      <li>
        <h3>${v.titel}</h3>
        <p>${v.tekst}</p>
      </li>`).join('\n');

schrijf('aanbod.html', pagina({
    titel: 'Aanbod',
    lightbox: false,
    omschrijving: 'Het hele aanbod van Artletics op een rij: workshops voor scholen, '
        + 'programma’s in de wijk, Artletics Plus op woonzorglocaties, de vier '
        + 'disciplines, en de groepslessen en Small Groups waar je je zelf voor aanmeldt.',
    inhoud: `    <p class="plain-eyebrow">Aanbod</p>
    <h1>Ontdek het aanbod van Artletics</h1>
    <p class="plain-lead">Artletics werkt op drie plekken &mdash; op school, in de wijk
    en op woonzorglocaties &mdash; en daarnaast kun je je als deelnemer gewoon zelf
    aanmelden voor de lessen. Alle programma&rsquo;s komen voort uit dezelfde vier
    disciplines: creatieve artwork, dans, muziek en sport. Wat er binnen een programma
    gebeurt verschilt wel, want het is afgestemd op de leeftijd en de plek.</p>
    <hr class="plain-rule">

    <h2>De programma&rsquo;s</h2>
    <p>Welk programma het wordt hangt af van wie het aanvraagt, waar de groep zit en om
    welke leeftijd het gaat. Elk programma heeft zijn eigen workshops: de vier
    workshoplijnen voor scholen en de wijk, en vier eigen disciplines bij Artletics
    Plus.</p>
    <ul class="aanbod-blokken">
${programmaBlokken}
    </ul>

    <h2>De vier workshoplijnen</h2>
    <p>Het aanbod voor scholen en voor de wijk is verdeeld over vier lijnen. Elke lijn
    heeft een eigen pagina met de posters en een beschrijving per workshop. Artletics
    Plus heeft een eigen opzet en staat daar los van.</p>
    <ul class="lijn-rij">
${lijnRij}
    </ul>

    <h2>De disciplines</h2>
    <p>De vier vakgebieden waar Artletics mee begon, en waar het aanbod nog steeds op
    rust.</p>
    <ul class="discipline-raster">
${disciplineKaarten}
    </ul>

    <h2>Zelf meedoen</h2>
    <p>Je hoeft niet te wachten tot je school of wijkcentrum iets organiseert: voor de
    lessen kun je je ook zelf aanmelden. Er zijn twee lesvormen, en dit geldt voor
    allebei:</p>
    <ul class="feiten">
${feitenBlok()}
    </ul>
    <p class="feiten-noot">
      <strong>${esc(FEITEN_NOOT.label)}</strong>
      ${esc(FEITEN_NOOT.tekst)}
    </p>
    <ul class="lesvormen">
${lesvormen}
    </ul>
    <a class="plain-cta" href="/aanmelden">Direct aanmelden</a>

    <h2>Vier inzetvormen</h2>
    <p>Voor scholen, gemeenten en organisaties: hetzelfde aanbod, in de vorm die bij de
    groep en de periode past.</p>
    <ul class="plain-cards">
${inzet}
    </ul>

    <h2>Wat je kunt verwachten</h2>
    <ul class="plain-cards">
${verwachten}
    </ul>

    <h2>Voor wie</h2>
    <p>Het grootste deel van het aanbod is voor kinderen en jongeren, vanaf groep 7 en 8
    tot en met het voortgezet onderwijs, praktijkonderwijs en mbo. Deelnemen kan via
    school, via een wijklocatie, binnen een vakantieprogramma of op eigen initiatief.
    Jongeren hoeven vooraf niet te weten waar hun talent ligt &mdash; daar is het aanbod
    juist voor.</p>
    <p><strong>Artletics Plus is er juist voor ouderen</strong>: 60-plussers op een
    woonzorglocatie, die zestien weken lang in een kleine vaste groep aan de slag gaan.
    Ook wie minder mobiel is of nooit eerder iets met kunst of sport deed, kan meedoen.</p>
    <p>Ouders en verzorgers zijn welkom bij de presentaties en eindevents. Vragen over
    deelname, begeleiding of veiligheid kunnen altijd gesteld worden.</p>

    <h2>Iets aanvragen of overleggen?</h2>
    <p>Vertel kort om welke groep het gaat, welke doelen je hebt en in welke periode je
    het wilt uitvoeren. Daarna maken we een voorstel op maat.</p>
    <a class="plain-cta" href="/contact">Vraag een voorstel aan</a>`
}));

console.log('');
geschreven.forEach(f => console.log('  ' + f.replace(/\\/g, '/')));
console.log(`${WORKSHOPS.length} workshops in ${LIJNEN.length} lijnen, `
    + `${[...plaatjes.values()].reduce((n, l) => n + l.length, 0)} flyers`);
if (!alleenPagina) {
    console.log(`${gemaakt} converted, ${overgeslagen} already there`
        + (force ? '' : ' (--force to redo)'));
}
