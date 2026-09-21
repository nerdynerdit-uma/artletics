// Shrinks the videos in assets/video/ for the web.
// Originals are moved to assets/video/original/ and never touched again, so this can be
// re-run and tuned without losing quality.
//
//   node tools/shrink-videos.js            every video that has not been shrunk yet
//   node tools/shrink-videos.js --force    do them all again from the originals
//
// Section background videos (<page>-section-<n>) play muted, so their audio is dropped.
// Videos people press play on (<page>-video-<n>) keep their sound.
// Both are capped at 1920 wide and 30fps and laid out to start playing while loading.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const DIR = 'assets/video';
const ORIGINALS = path.join(DIR, 'original');
const MAX_WIDTH = 1920;
const QUALITY = 28; // higher means smaller; 28 is close to invisible at background size

const force = process.argv.includes('--force');
fs.mkdirSync(ORIGINALS, { recursive: true });

function mb(file) {
    return fs.statSync(file).size / 1048576;
}

const videos = fs.readdirSync(DIR).filter(f => /\.(mp4|mov|webm)$/i.test(f));
if (!videos.length) {
    console.log('no videos in assets/video/');
    process.exit(0);
}

let before = 0;
let after = 0;

for (const name of videos) {
    const live = path.join(DIR, name);
    const original = path.join(ORIGINALS, name);

    // Keep the untouched file once; re-runs start from it
    if (!fs.existsSync(original)) fs.copyFileSync(live, original);
    else if (!force) {
        // Already shrunk earlier: skip unless asked to redo
        if (mb(live) < mb(original)) {
            console.log(`${name.padEnd(30)} already shrunk (${mb(live).toFixed(1)} MB)`);
            before += mb(original);
            after += mb(live);
            continue;
        }
    }

    const target = path.join(DIR, name.replace(/\.(mp4|mov|webm)$/i, '.mp4'));
    const temp = target + '.tmp.mp4';
    const startedAt = Date.now();
    // Section backgrounds play muted; videos people press play on keep their sound
    const silent = /-section-\d+\.[a-z0-9]+$/i.test(name);
    const audio = silent ? ['-an'] : ['-c:a', 'aac', '-b:a', '128k'];
    execFileSync(ffmpeg, [
        '-y', '-loglevel', 'error',
        '-i', original,
        ...audio,
        '-vf', `scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos,fps=30`,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', String(QUALITY),
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        temp
    ], { stdio: ['ignore', 'inherit', 'inherit'] });

    fs.renameSync(temp, target);
    if (target !== live && fs.existsSync(live)) fs.unlinkSync(live);

    const from = mb(original);
    const to = mb(target);
    before += from;
    after += to;
    console.log(`${name.padEnd(30)} ${from.toFixed(1)} MB -> ${to.toFixed(1)} MB  (${Math.round((1 - to / from) * 100)}% smaller, ${Math.round((Date.now() - startedAt) / 1000)}s)`);
}

console.log(`\ntotal ${before.toFixed(1)} MB -> ${after.toFixed(1)} MB (${Math.round((1 - after / before) * 100)}% smaller)`);
console.log(`originals kept in ${ORIGINALS}`);
