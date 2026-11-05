// Pulls the four discipline illustrations out of the Artletics+ project plan and
// writes them web-sized into assets/images/artletics-plus/.
//
//   node tools/plus-beelden.js                 the default source PDF
//   node tools/plus-beelden.js "<file.pdf>"    another copy of the plan
//   node tools/plus-beelden.js --force         convert again, even if present
//
// Chapters 6 to 9 of the plan (pages 7 to 10) each open with one illustration. They sit
// in the PDF as 1378x919 raw RGB, Flate-compressed, in page order, so they can be read
// without a PDF library: find the image objects of that size, inflate them and hand the
// pixels straight to ffmpeg.
//
// The images are AI-generated, which the plan states under every one of them. The page
// says so too; see workshops/artletics-plus.html.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const DEFAULT_PDF = path.join(process.env.USERPROFILE || process.env.HOME || '',
    'Documents/Klanten/Stichting Facts/Artletics/2026',
    'wetransfer_artletics-plus-projectplan-2027-stichting-facts-pdf_2026-11-05_0926',
    'Artletics Plus Projectplan 2027 Stichting Facts.pdf');

const UIT_DIR = 'assets/images/artletics-plus';
const BREED = 1378;
const HOOG = 919;
const TEGEL_BREED = 1000;  // grid tile; the page is full width, so two tiles are wide
const GROOT_BREED = 1378;  // the lightbox; this is the original width
const KWALITEIT = 80;

// In the order the chapters appear in the plan.
const DISCIPLINES = [
    { slug: 'power-up', titel: 'Bewegen en fitness — Power Up' },
    { slug: 'move-it', titel: 'Yoga en dans — Move It' },
    { slug: 'create-your-sound', titel: 'Muziek — Create Your Sound' },
    { slug: 'design-it', titel: 'Design — Design It' }
];

const args = process.argv.slice(2);
const force = args.includes('--force');
const bronPdf = args.find(a => !a.startsWith('--')) || DEFAULT_PDF;

if (!fs.existsSync(bronPdf)) {
    console.error(`project plan not found:\n  ${bronPdf}`);
    console.error('Pass the PDF as an argument.');
    process.exit(1);
}

// --- the illustrations in the PDF --------------------------------------------------
const pdf = fs.readFileSync(bronPdf);
const beelden = [];
const kop = new RegExp(`/Subtype\\s*/Image[^>]*?/Width\\s+${BREED}\\b[^>]*?`
    + `/Height\\s+${HOOG}\\b[^>]*?/Filter\\s*/FlateDecode`, 'g');

for (const m of pdf.toString('latin1').matchAll(kop)) {
    const start = pdf.indexOf('stream', m.index);
    if (start === -1) continue;
    let p = start + 'stream'.length;
    if (pdf[p] === 0x0d) p++;
    if (pdf[p] === 0x0a) p++;
    const eind = pdf.indexOf('endstream', p);
    beelden.push(zlib.inflateSync(pdf.subarray(p, eind)));
}

if (beelden.length !== DISCIPLINES.length) {
    console.error(`expected ${DISCIPLINES.length} illustrations of ${BREED}x${HOOG} in`
        + ` the plan, found ${beelden.length}.`);
    console.error('The plan was probably re-exported; check which images it holds now.');
    process.exit(1);
}

// --- to the web --------------------------------------------------------------------
function webp(pixels, naar, breedte) {
    execFileSync(ffmpeg, [
        '-y', '-loglevel', 'error',
        '-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', `${BREED}x${HOOG}`,
        '-i', 'pipe:0',
        '-vf', `scale=${breedte}:-2:flags=lanczos`,
        '-quality', String(KWALITEIT),
        '-compression_level', '6',
        naar
    ], { input: pixels, maxBuffer: pixels.length + (1 << 20) });
}

const kb = file => Math.round(fs.statSync(file).size / 1024);

fs.mkdirSync(UIT_DIR, { recursive: true });
let gemaakt = 0;
let overgeslagen = 0;

DISCIPLINES.forEach((d, i) => {
    const tegel = path.join(UIT_DIR, `${d.slug}-tegel.webp`);
    const groot = path.join(UIT_DIR, `${d.slug}.webp`);
    if (!force && fs.existsSync(tegel) && fs.existsSync(groot)) {
        overgeslagen++;
        return;
    }
    webp(beelden[i], tegel, TEGEL_BREED);
    webp(beelden[i], groot, GROOT_BREED);
    gemaakt++;
    console.log(`  ${d.slug.padEnd(18)} ${String(kb(tegel)).padStart(4)} KB tile, `
        + `${String(kb(groot)).padStart(4)} KB large   <- ${d.titel}`);
});

console.log(`\n${UIT_DIR}: ${gemaakt} converted, ${overgeslagen} already there`
    + (force ? '' : ' (--force to redo)'));
