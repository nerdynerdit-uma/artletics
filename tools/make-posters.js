// Makes a cover image for each video people press play on, so the player shows a still
// instead of black. Background videos autoplay and need none.
//
//   node tools/make-posters.js                   a frame 3 seconds in, for videos without one
//   node tools/make-posters.js dans-video-2 12   a frame 12 seconds into that video
//   node tools/make-posters.js --force           redo them all
//
// Writes assets/video/posters/<name>.jpg, which the converter picks up automatically.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const DIR = 'assets/video';
const POSTERS = path.join(DIR, 'posters');
const DEFAULT_AT = 3;

const args = process.argv.slice(2);
const force = args.includes('--force');
const named = args.filter(a => !a.startsWith('--'));
const only = named[0];
const at = named[1] ? Number(named[1]) : DEFAULT_AT;

fs.mkdirSync(POSTERS, { recursive: true });

const videos = fs.readdirSync(DIR)
    .filter(f => /-video-\d+\.mp4$/i.test(f))
    .filter(f => !only || f === `${only}.mp4` || f === only);

if (!videos.length) {
    console.log(only ? `no video called ${only}` : 'no page videos in assets/video/');
    process.exit(0);
}

for (const file of videos) {
    const name = file.replace(/\.mp4$/i, '');
    const poster = path.join(POSTERS, `${name}.jpg`);
    if (fs.existsSync(poster) && !force && !only) {
        console.log(`${name.padEnd(34)} has a cover already`);
        continue;
    }
    try {
        execFileSync(ffmpeg, [
            '-y', '-loglevel', 'error',
            '-ss', String(at), '-i', path.join(DIR, file),
            '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-q:v', '4',
            poster
        ], { stdio: ['ignore', 'inherit', 'inherit'] });
        const kb = fs.statSync(poster).size / 1024;
        console.log(`${name.padEnd(34)} cover from ${at}s (${Math.round(kb)} KB)`);
    } catch (err) {
        console.log(`${name.padEnd(34)} FAILED (${String(err.message).split('\n')[0].slice(0, 50)})`);
    }
}
