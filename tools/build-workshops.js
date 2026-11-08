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
const { LESVORMEN, DETAILS } = require('./workshop-detail');
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

// The icons along the foot of every poster, redrawn as line art so the workshop page
// can repeat them beside the explanation. They are deliberately plain single-colour
// strokes: the posters are busy, the page is not, and an icon here only has to say
// which of the four points on the poster is being explained. `icoon` in
// tools/workshop-detail.js picks one by key.
const svg = inhoud => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" `
    + `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" `
    + `aria-hidden="true" focusable="false">${inhoud}</svg>`;

const ICONEN = {
    // pen nib - logo & branding
    logo: svg('<path d="M12 2.5 5.6 9.4l2.3 9 4.1 3.1 4.1-3.1 2.3-9L12 2.5Z"/>'
        + '<path d="M12 14.4v7.1"/><circle cx="12" cy="11.5" r="1.8"/>'),
    // t-shirt - kledingdesign
    shirt: svg('<path d="M8.6 3.4 4 6l1.7 3.9 2-.9v11.6h8.6V9l2 .9L20 6l-4.6-2.6"/>'
        + '<path d="M8.6 3.4a3.4 3.4 0 0 0 6.8 0"/>'),
    // lightbulb - creativiteit, creatieve expressie
    lamp: svg('<path d="M9.3 16.4a6 6 0 1 1 5.4 0"/><path d="M9.6 18.6h4.8"/>'
        + '<path d="M10.5 21h3"/>'),
    // three people - presenteren, samen creeren, klantgerichtheid
    groep: svg('<circle cx="12" cy="8.4" r="2.7"/><circle cx="5.4" cy="10.2" r="2"/>'
        + '<circle cx="18.6" cy="10.2" r="2"/>'
        + '<path d="M7.4 18.8c0-2.7 2-4.3 4.6-4.3s4.6 1.6 4.6 4.3"/>'
        + '<path d="M2.6 17.6c0-2 1.2-3.2 2.8-3.2"/>'
        + '<path d="M21.4 17.6c0-2-1.2-3.2-2.8-3.2"/>'),
    // pencil - schets & letters
    potlood: svg('<path d="M4 20h3.6L20 7.6a2.5 2.5 0 0 0-3.6-3.6L4 16.4V20Z"/>'
        + '<path d="M15 5.4 18.6 9"/>'),
    // spray can - kleur & techniek
    spuitbus: svg('<rect x="7" y="8.2" width="7" height="12.6" rx="1.6"/>'
        + '<path d="M8.6 8.2V5.6h3.8v2.6"/>'
        + '<path d="M17.2 5.4h.01M19.6 3.9h.01M19.6 7.6h.01M17.2 9.6h.01"/>'),
    // palette - kleur
    palet: svg('<path d="M12 3.3c-5 0-8.8 3.6-8.8 8.2 0 4.3 3.3 7.4 7.3 7.4 1.5 0 2.2-.8 '
        + '2.2-1.7 0-.6-.3-1-.3-1.6 0-.8.6-1.4 1.6-1.4h1.6c3 0 5.2-2 5.2-4.9 '
        + '0-3.4-3.5-6-8.8-6Z"/><circle cx="7.5" cy="11.2" r=".9"/>'
        + '<circle cx="10.3" cy="7.8" r=".9"/><circle cx="14.3" cy="7.8" r=".9"/>'
        + '<circle cx="17.1" cy="10.8" r=".9"/>'),
    // brush - techniek
    penseel: svg('<path d="M20.2 3.9c-.9-.9-2-.5-3.4.9l-5.5 5.5 2.5 2.5 5.5-5.5c1.4-1.4 '
        + '1.8-2.5.9-3.4Z"/><path d="M11.3 10.3 8.1 13.5l2.5 2.5 3.2-3.2"/>'
        + '<path d="M8.1 13.5c-1.6 0-2.6 1-2.9 2.2-.2 1-.7 1.6-1.6 2.1 1.6.9 4.4.6 '
        + '5.5-1 .6-.9.5-2-.5-3Z"/>'),
    // heart - zelfexpressie
    hart: svg('<path d="M12 20.3s-7-4.4-7-9a4 4 0 0 1 7-2.6 4 4 0 0 1 7 2.6c0 4.6-7 9-7 9Z"/>'),
    // scissors - knippen & contouren
    schaar: svg('<circle cx="6.2" cy="17.8" r="2.6"/><circle cx="17.8" cy="17.8" r="2.6"/>'
        + '<path d="M8 16 19 4"/><path d="M16 16 5 4"/>'),
    // head in profile - haar & hoofdvorm
    hoofd: svg('<path d="M17 20.6v-3.3c1.9-1.4 3-3.5 3-5.9a8 8 0 0 0-15.8-1.6c-.2 1-.6 '
        + '1.9-1.2 2.7-.4.6 0 1.4.7 1.4H5v2.8c0 1.1.9 2 2 2h2"/>'
        + '<path d="M7.6 7.4c1.6-1.4 4.2-1.9 6.2-1"/>'),
    // pump bottle and a sparkle - hygiene
    fles: svg('<rect x="7.6" y="8.6" width="7" height="12" rx="1.8"/>'
        + '<path d="M9.6 8.6V6h3v2.6"/><path d="M12.6 3.4h2.8v2"/>'
        + '<path d="M19.4 9.2l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5Z"/>'),
    // bars and a rising line - ondernemerschap
    groei: svg('<path d="M3.6 20.6h17"/><path d="M7 20.6v-4.8M12 20.6v-7.6M17 20.6v-10.4"/>'
        + '<path d="M5.4 9.6 10 6l3 2.2 5.6-4.8"/><path d="M14.8 3.4h3.9v3.9"/>'),
    // a braid - vlechten & stylen
    vlecht: svg('<path d="M12 3.4v17.2"/>'
        + '<path d="M12 4.6c-2.2 1-2.2 3 0 4s2.2 3 0 4-2.2 3 0 4"/>'
        + '<path d="M12 4.6c2.2 1 2.2 3 0 4s-2.2 3 0 4 2.2 3 0 4"/>'),
    // a bottle and a tube - haarverzorging
    verzorging: svg('<rect x="3.4" y="9.2" width="6" height="11.4" rx="1.6"/>'
        + '<path d="M5 9.2V6.6h2.8v2.6"/><path d="M5.2 4.4h2.4"/>'
        + '<path d="M14.4 20.6h6.2V12l-1.3-3h-3.6l-1.3 3v8.6Z"/>'
        + '<path d="M15.6 9V6.6h3.8V9"/>')
};

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
    const meer = beelden.length > 1 ? ` Er zijn ${telwoord(beelden.length)} versies.` : '';

    const ontbrekend = d.iconen.filter(i => !ICONEN[i.icoon]);
    if (ontbrekend.length) {
        console.error(`${w.slug}: no drawing for `
            + ontbrekend.map(i => i.icoon).join(', '));
        process.exit(1);
    }

    const iconen = d.iconen.map(i => `      <li>
        <span class="ws-icoon" style="--lijn: ${lijn.kleur}">${ICONEN[i.icoon]}</span>
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
        </button>
        <figcaption>Klik op de poster om hem groot te bekijken.${meer}</figcaption>
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
    <p>Bij Artletics kun je kiezen uit twee lesvormen.</p>
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

console.log('');
geschreven.forEach(f => console.log('  ' + f.replace(/\\/g, '/')));
console.log(`${WORKSHOPS.length} workshops in ${LIJNEN.length} lijnen, `
    + `${[...plaatjes.values()].reduce((n, l) => n + l.length, 0)} flyers`);
if (!alleenPagina) {
    console.log(`${gemaakt} converted, ${overgeslagen} already there`
        + (force ? '' : ' (--force to redo)'));
}
