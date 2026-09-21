// Downloads the videos the original streams (section backgrounds and videos inside
// pages) and saves them into assets/video/ with the names the converter expects.
//
//   node tools/fetch-videos.js              every page, skipping files already there
//   node tools/fetch-videos.js muziek       one page
//   node tools/fetch-videos.js --force      download again, replacing existing files
//
// The originals are HLS streams, so ffmpeg stitches the pieces back into an MP4.
// Run tools/shrink-videos.js afterwards to make them small enough for the web.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const RENDERED = '_raw/rendered';
const MEASUREMENTS = '_raw/measurements';
const OUT = 'assets/video';

// Which videos a page has, and where each belongs
function videosOn(slug) {
    const html = fs.readFileSync(path.join(RENDERED, `${slug}.html`), 'utf8');
    const sectionStarts = [...html.matchAll(/<section[^>]*class="[^"]*page-section/g)].map(m => m.index);

    const measurementFile = path.join(MEASUREMENTS, `${slug}.json`);
    const sections = fs.existsSync(measurementFile)
        ? JSON.parse(fs.readFileSync(measurementFile, 'utf8')).desktop.sections || []
        : [];

    const found = new Map(); // url -> first position in the page
    for (const match of html.matchAll(/alexandriaUrl&quot;:\s*&quot;([^&]+)&quot;/g)) {
        if (!found.has(match[1])) found.set(match[1], match.index);
    }

    const perSection = new Map();
    for (const [url, at] of found) {
        let index = 0;
        sectionStarts.forEach((start, i) => { if (at > start) index = i; });
        if (!perSection.has(index)) perSection.set(index, []);
        perSection.get(index).push({ url, at });
    }

    // A section that has a background video takes the first video found in it;
    // anything else in the page is a video block, numbered in the order they appear.
    const wanted = [];
    const blocks = [];
    for (const [index, list] of [...perSection.entries()].sort((a, b) => a[0] - b[0])) {
        list.sort((a, b) => a.at - b.at);
        const hasBackground = sections[index] && sections[index].background && sections[index].background.video;
        list.forEach((video, i) => {
            if (hasBackground && i === 0) wanted.push({ ...video, name: `${slug}-section-${index + 1}` });
            else blocks.push(video);
        });
    }
    blocks.sort((a, b) => a.at - b.at);
    blocks.forEach((video, i) => wanted.push({ ...video, name: `${slug}-video-${i + 1}` }));

    return wanted;
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const slugs = args.filter(a => !a.startsWith('--'));
const pages = slugs.length ? slugs : fs.readdirSync(RENDERED).map(f => f.replace(/\.html$/, ''));

fs.mkdirSync(OUT, { recursive: true });
let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const slug of pages) {
    let wanted = [];
    try {
        wanted = videosOn(slug);
    } catch (err) {
        console.log(`${slug}: could not read the page (${err.message})`);
        continue;
    }
    for (const video of wanted) {
        const target = path.join(OUT, `${video.name}.mp4`);
        if (fs.existsSync(target) && !force) {
            console.log(`${video.name.padEnd(42)} already here, left alone`);
            skipped++;
            continue;
        }
        const playlist = video.url.replace('{variant}', 'playlist.m3u8');
        const temp = `${target}.tmp.mp4`;
        try {
            execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', playlist, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', temp],
                { stdio: ['ignore', 'inherit', 'inherit'], timeout: 300000 });
            fs.renameSync(temp, target);
            const mb = fs.statSync(target).size / 1048576;
            console.log(`${video.name.padEnd(42)} downloaded ${mb.toFixed(1)} MB`);
            downloaded++;
        } catch (err) {
            if (fs.existsSync(temp)) fs.unlinkSync(temp);
            console.log(`${video.name.padEnd(42)} FAILED (${String(err.message).split('\n')[0].slice(0, 60)})`);
            failed++;
        }
    }
}

console.log(`\n${downloaded} downloaded, ${skipped} already present, ${failed} failed`);
if (downloaded) console.log('now run: node tools/shrink-videos.js');
