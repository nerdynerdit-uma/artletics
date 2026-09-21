// Converts a saved Squarespace page into a clean static page.
//
//   node tools/convert.js welkom          one page
//   node tools/convert.js --all           every page in _raw/pages
//
// What it keeps: the Fluid Engine grid maths (section grids and per-block grid-area
// coordinates), the text with its inline colours, and the images (rewritten to local
// files). What it drops: Squarespace's stylesheets, scripts, tracking and wrappers.
//
// Output: <slug>.html in the repo root + assets/css/pages/<slug>.css

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES_DIR = '_raw/pages';
const RENDERED_DIR = '_raw/rendered';
const CSS_OUT_DIR = 'assets/css/pages';
const MANIFEST = '_raw/image-manifest.json';
const MEASUREMENTS_DIR = '_raw/measurements';

// Pages that exist on the live site but were dropped from the replica at the user's
// request. They are not built, and every link to them is removed from the pages and
// the footer, so nothing points at a missing address.
const REMOVED_PAGES = new Set([
    'subsidieregeling',
    'jongeren-aan-het-woord',
    'portfolio-1__project-six-6f87e-5dxgy' // Week 6: only a "binnenkort beschikbaar" placeholder
]);

const SLUG_TO_FILE = { home: 'welkom' };
const HOME_SLUG = 'welkom'; // the live site serves this at /

// --- image lookup: CDN url (without query) -> local path ---------------------------
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const imageByUrl = new Map();
for (const entry of manifest.downloaded) {
    imageByUrl.set(entry.url.split('?')[0], entry.file.replace(/\\/g, '/'));
}

function localImage(url) {
    if (!url) return null;
    const clean = url.split('?')[0].replace(/^\/\//, 'https://');
    if (imageByUrl.has(clean)) return '/' + imageByUrl.get(clean);
    // Squarespace sometimes appends a size suffix Squarespace resolves server-side
    for (const [cdn, file] of imageByUrl) {
        if (clean.startsWith(cdn) || cdn.startsWith(clean)) return '/' + file.replace(/\\/g, '/');
    }
    return null;
}

// --- helpers ----------------------------------------------------------------------
function pageSlug(file) {
    return file.replace(/\.html$/, '');
}

// Links match the live site's addresses: /over-ons, /portfolio-1/week2
// Addresses the user renamed. The sub-pages move with their parent, so
// portfolio-1__week2 is published at /galerij/week2.
// The gallery's sub-pages get readable addresses in place of Squarespace's generated
// ones. The specific entries come first: publicSlug takes the first match.
const RENAMED_PAGES = {
    'portfolio-1__project-one-f5w4d-kybrb': 'galerij__introductiedag',
    'portfolio-1__week2': 'galerij__week-2',
    'portfolio-1__project-three-sng7y-pal9z': 'galerij__week-3',
    'portfolio-1__project-four-l3zw3-btry6': 'galerij__week-4',
    'portfolio-1__project-five-748cx-xwhsl': 'galerij__week-5',
    'portfolio-1': 'galerij'
};

function publicSlug(slug) {
    for (const [from, to] of Object.entries(RENAMED_PAGES)) {
        if (slug === from) return to;
        if (slug.startsWith(`${from}__`)) return to + slug.slice(from.length);
    }
    return slug;
}

function href(slug) {
    return slug === HOME_SLUG ? '/' : `/${publicSlug(slug).replace(/__/g, '/')}`;
}

// Rewrites links that point at the live site's paths to our local files
function rewriteHref(url, knownSlugs) {
    if (!url || /^(https?:|mailto:|tel:|#)/.test(url)) return url;
    const clean = url.replace(/^\//, '').replace(/\/$/, '');
    if (clean === '' || clean === 'home') return '/';
    const slug = clean.replace(/\//g, '__');
    if (knownSlugs.has(slug)) return href(slug);
    return url;
}

function cleanAttributes($, root) {
    root.find('*').each((i, el) => {
        for (const name of Object.keys(el.attribs || {})) {
            if (/^data-(?!src|image)/.test(name) || /^(onclick|onload)$/.test(name)) {
                $(el).removeAttr(name);
            }
        }
    });
}

// All inline CSS of a page, read once per page
const pageCssCache = new WeakMap();
function pageCss($) {
    if (!pageCssCache.has($)) pageCssCache.set($, $('style').map((i, el) => $(el).html()).get().join('\n'));
    return pageCssCache.get($);
}

// How the original fits an image in its frame: 'contain' shows all of it (most of the
// site, including the logo), 'cover' crops it to fill
function imageFit($, blockClass) {
    const id = (blockClass || '').replace('fe-block-', '');
    const rule = id && pageCss($).match(new RegExp(`#block-${id}\\s*\\{([^}]*)\\}`));
    const fit = rule && (rule[1].match(/--image-component-object-fit:\s*(\w+)/) || [])[1];
    const focal = rule && (rule[1].match(/--image-component-focal-point:\s*([^;]+);/) || [])[1];
    return { fit: fit || 'cover', focal: (focal || '50% 50%').trim() };
}

// A marquee can sit on a coloured band of its own (the purple strip on Info, the
// turquoise one on Fotos Voorbereiding), with its own padding. Squarespace keeps both
// in data-container-styles, so they are read from there rather than from the CSS.
function marqueeContainer(marquee) {
    let styles = {};
    try {
        styles = JSON.parse(marquee.attr('data-container-styles') || '{}');
    } catch {
        return '';
    }
    const parts = [];
    const hsla = styles.backgroundEnabled
        && styles.backgroundColor
        && styles.backgroundColor.customColor
        && styles.backgroundColor.customColor.hslaValue;
    if (hsla) {
        const round = n => Math.round(n * 100) / 100;
        parts.push(`--marquee-band: hsla(${round(hsla.hue)}, ${round(hsla.saturation * 100)}%, ` +
            `${round(hsla.lightness * 100)}%, ${round(hsla.alpha)})`);
    }
    // Height of the band: the original's padding is a percentage of the block's width.
    // Only top and bottom are carried over; the text runs edge to edge, as it does there.
    const pad = styles.padding;
    if (hsla && pad) {
        const side = key => (pad[key] ? `${pad[key].value}${pad[key].unit}` : '0');
        parts.push(`--marquee-pad: ${side('top')} 0 ${side('bottom')}`);
    }
    return parts.length ? `; ${parts.join('; ')}` : '';
}

// Text placed above a page's card grid at the user's request; not on the live site.
// The heading itself sits in the page's own hero (see CONTENT_EDITS), so only the
// sentence is added here.
const GRID_INTROS = {
    'portfolio-1': {
        text: 'Een terugblik op workshops, trajecten en eindmomenten die Artletics ' +
            'daadwerkelijk heeft uitgevoerd met leerlingen en jongeren.'
    }
};

// Text the user asked to change, which therefore differs from the live site. Each entry
// names the block it belongs to and the exact text to swap, so a rebuild keeps the edit
// and a mismatch is reported instead of silently doing nothing.
const CONTENT_EDITS = [
    {
        block: 'fe-block-ca2a7e4d76b92239f263',
        note: 'footer visiting address, moved to Schiedam 2026-09-21',
        find: 'Westblaak 92, 3012 KM Rotterdam ',
        replace: 'Calandstraat 63, 3125 BA Schiedam, Netherlands'
    },
    {
        block: 'fe-block-1cfe23816540c10bd90d',
        note: 'gallery hero title, renamed 2026-09-21',
        find: '<span class="sqsrte-text-color--white">WORKSHOPS EN TO</span><span class="sqsrte-text-color--custom" style="color: hsl(296, 78%, 50%)">FF</span><span class="sqsrte-text-color--white">E DINGEN</span>',
        replace: '<span class="sqsrte-text-color--custom" style="color: hsl(296, 78%, 50%)">ART</span>' +
            '<span class="sqsrte-text-color--white">LETICS IN DE PRAKTIJK</span>'
    },
    {
        block: 'fe-block-yui_3_17_2_1_1756538813343_3749',
        note: 'homepage intro, new copy supplied 2026-09-21',
        find: 'is een cultureel programma dat kunst en cultuur centraal stelt, waarin jongeren de kans krijgen zich creatief uit te drukken. Het programma is ontwikkeld door <strong>Stichting Facts</strong> en <strong>Youngins</strong> en richt zich op jongeren vanaf 12 jaar tot 16 jaar.',
        replace: 'biedt een breed en praktijkgericht workshopaanbod waarin sport, cultuur, media, ' +
            'creativiteit, gezondheid en sociale ontwikkeling samenkomen. Leerlingen en jongeren ' +
            'creëren, bewegen, ontdekken en groeien onder begeleiding van ervaren professionals ' +
            'uit de praktijk.<br><br>Artletics is inzetbaar als losse workshop, lessenreeks, ' +
            'schooltraject, naschools aanbod, wijkprogramma of Impactweek. De invulling wordt ' +
            'afgestemd op de doelgroep, doelen, beschikbare periode en locatie.'
    },
    {
        block: 'fe-block-17933744fcf19f8ec43f',
        note: 'homepage disciplines, orange line added 2026-09-21',
        find: 'en zich sociaal en persoonlijk te ontwikkelen.</em></strong><em>&nbsp; </em>',
        replace: 'en zich sociaal en persoonlijk te ontwikkelen.</em></strong><em>&nbsp; </em>' +
            '<br><br><span class="sqsrte-text-color--custom" style="color: rgb(255, 146, 41)">' +
            '<strong><em>Voor groep 7 en 8, voortgezet onderwijs, praktijkonderwijs en mbo. ' +
            'Ook inzetbaar op wijklocaties en binnen vakantieprogramma’s.</em></strong></span>'
    },
    {
        block: 'fe-block-yui_3_17_2_1_1756538813343_4728',
        note: 'homepage "Ontdekken door te doen" heading, new copy 2026-09-21',
        find: 'Het programma is bedacht naar aanleiding van enquêtes die onder jongeren met leeftijdscategorie 12-16 jaar zijn uitgedeeld.&nbsp; ',
        replace: '<strong>ONTDEKKEN DOOR TE DOEN</strong>'
    },
    {
        block: 'fe-block-yui_3_17_2_1_1756538813343_4728',
        note: 'homepage "Ontdekken door te doen" body, new copy 2026-09-21',
        find: 'In een&nbsp; samenleving waar cultuur niet alleen door kunst, muziek of theater wordt uitgedragen, maar ook&nbsp; door de manier waarop mensen zich met elkaar verbinden, biedt voetbal een krachtig middel om jongeren in aanraking te brengen met de bredere culturele waarden van samenwerking, respect,&nbsp; discipline en zelfexpressie. Door voetbal op te nemen in het programma van Artletics, worden jongeren niet&nbsp;alleen fysiek geactiveerd, maar wordt hen ook een platform aangeboden om zich te uiten en te ontwikkelen als culturele deelnemers. ',
        replace: 'Jongeren hoeven vooraf niet te weten waar hun talent ligt. Binnen Artletics kunnen zij ' +
            'creëren, bewegen, maken, samenwerken en ontdekken wat bij hen past.<br><br>' +
            'Artletics biedt uiteenlopende workshops op het gebied van sport, cultuur, media, ' +
            'creativiteit, gezondheid en persoonlijke ontwikkeling. Denk bijvoorbeeld aan design, ' +
            'dans, muziek en DJ, voetbal, (kick)boksen, graffiti en street art, koken, hairstyling ' +
            'en social media &amp; content.<br><br>' +
            'De workshops kunnen afzonderlijk worden ingezet of worden gecombineerd tot een ' +
            'lessenreeks, meerweeks traject, schoolprogramma, wijkprogramma of Impactweek. Een ' +
            'traject kan worden afgesloten met een presentatie, showcase of gezamenlijk eindevent.'
    }
];

// Questions dropped from the FAQ page, by the number they carry on the live site.
// The ones that stay are renumbered from 1 without gaps.
const REMOVED_FAQS = [1];

// The FAQ runs across two columns and its numbering does not follow document order
// (5-9 sit in the left block, 1-4 and 10-12 in the right), so the numbers are read from
// the text itself. A question is a paragraph starting with "<n>." and its answer is the
// paragraph after it.
function dropFaqs(html, warnings) {
    const $ = cheerio.load(html, null, false);
    const numbered = /^\s*(\d+)\.\s/;
    const questions = [];

    $('p').each((i, el) => {
        const match = numbered.exec($(el).text());
        if (match) questions.push({ number: Number(match[1]), el });
    });

    for (const gone of REMOVED_FAQS) {
        const question = questions.find(q => q.number === gone);
        if (!question) {
            warnings.push(`faqs: question ${gone} is no longer on the page`);
            continue;
        }
        $(question.el).next('p').remove(); // its answer
        $(question.el).remove();
    }

    const staying = questions.filter(q => !REMOVED_FAQS.includes(q.number)).sort((a, b) => a.number - b.number);
    staying.forEach((question, index) => {
        const wanted = index + 1;
        if (question.number === wanted) return;
        const before = $(question.el).html();
        // The number sits at the start, sometimes inside the <strong>, sometimes before it
        $(question.el).html(before.replace(/(^|>)(\s*)\d+\.(\s|&nbsp;)/, `$1$2${wanted}.$3`));
    });

    return $.html();
}

function applyContentEdits(html, blockClass, slug, warnings) {
    for (const edit of CONTENT_EDITS) {
        if (edit.block !== blockClass) continue;
        if (!html.includes(edit.find)) {
            warnings.push(`${slug}: content edit "${edit.note}" no longer matches the live text`);
            continue;
        }
        html = html.replace(edit.find, edit.replace);
    }
    return html;
}

// --- blocks -----------------------------------------------------------------------
function convertBlock($, block, warnings, slug, knownSlugs, state) {
    const inner = block.find('[class*="sqs-block"]').first();
    const classes = inner.attr('class') || '';
    const type = ['image', 'video', 'marquee', 'quote', 'form', 'map', 'image-link', 'image-button']
        .find(t => classes.includes(`sqs-block-${t}`) || classes.includes(`${t}-block`)) || 'html';

    if (type === 'image' || type === 'image-link' || type === 'image-button') {
        const img = block.find('img').first();
        const src = img.attr('data-src') || img.attr('src');
        const local = localImage(src);
        if (!local) {
            warnings.push(`${slug}: image not downloaded -> ${(src || '').slice(0, 80)}`);
            return '';
        }
        const alt = (img.attr('alt') || '').replace(/"/g, '&quot;');
        const ratio = inner.attr('data-aspect-ratio');
        const style = ratio ? ` style="--ratio: ${(100 / parseFloat(ratio)).toFixed(4)}"` : '';
        const link = block.find('a').first().attr('href');
        const blockClass = (block.attr('class') || '').split(/\s+/).find(c => c.startsWith('fe-block-'));
        const { fit, focal } = imageFit($, blockClass);
        const picture = `<img src="${local}" alt="${alt}" loading="lazy" style="object-fit: ${fit}; object-position: ${focal}">`;
        const wrapped = link
            ? `<a href="${rewriteHref(link, knownSlugs)}">${picture}</a>`
            : picture;
        return `<figure class="block-image"${style}>${wrapped}</figure>`;
    }

    if (type === 'video') {
        const position = ++state.videos; // numbering matches assets/video/README.md
        const iframe = block.find('iframe').first();
        const src = iframe.attr('src') || iframe.attr('data-src');
        if (src) return `<div class="block-video"><iframe src="${src}" loading="lazy" allowfullscreen title="Video"></iframe></div>`;

        // Videos hosted by the original are streams that cannot be downloaded, so the
        // file has to be supplied in assets/video/ as <page>-video-<n>.<ext>
        const videoTypes = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
        const file = Object.keys(videoTypes)
            .map(ext => `assets/video/${slug}-video-${position}${ext}`)
            .find(f => fs.existsSync(f));
        if (!file) {
            warnings.push(`${slug}: video ${position} is missing, add assets/video/${slug}-video-${position}.mp4`);
            return '';
        }
        // Cover image shown before play, made by tools/make-posters.js
        const poster = `assets/video/posters/${slug}-video-${position}.jpg`;
        const cover = fs.existsSync(poster) ? ` poster="/${poster}"` : '';
        return `<div class="block-video"><video controls playsinline preload="metadata"${cover}>` +
            `<source src="/${file}" type="${videoTypes[path.extname(file)]}"></video></div>`;
    }

    // Marquee: a strip of text sliding sideways. The original animates it with script;
    // here it is a CSS animation, with the items, direction and speed setting taken from
    // the original's own data. Speed in pixels per second is an estimate: the original's
    // script does not run outside a real browser, so it could not be measured.
    if (type === 'marquee') {
        const marquee = block.find('.Marquee').first();
        let items = [];
        try {
            items = JSON.parse(marquee.attr('data-marquee-items') || '[]').map(i => i.text).filter(Boolean);
        } catch {
            items = block.find('.Marquee-item').map((i, el) => $(el).text().replace(/\s+/g, ' ').trim()).get();
        }
        // Keep the original's order and repeats: separators appear more than once
        if (!items.length) {
            warnings.push(`${slug}: marquee block without any text`);
            return '';
        }
        const direction = marquee.attr('data-animation-direction') === 'right' ? 'right' : 'left';
        const speed = parseFloat(marquee.attr('data-animation-speed')) || 1;
        const pixelsPerSecond = Math.round(50 * speed);
        const spacing = (marquee.attr('style') || '').match(/--marquee-item-spacing:\s*([^;]+)/);
        const gap = spacing ? spacing[1].trim() : '0.5em';
        const strip = items.map(text => `<h1 class="marquee-item">${text}</h1>`).join('');
        const band = marqueeContainer(marquee);
        return `<div class="block-text"><div class="marquee" data-speed="${pixelsPerSecond}" data-direction="${direction}" style="--marquee-gap: ${gap}${band}">` +
            `<div class="marquee-track">${strip}</div></div></div>`;
    }

    if (type === 'map') {
        // The address the user gave (Calandstraat 63, Schiedam), geocoded once via
        // OpenStreetMap, so the map needs no API key
        const bbox = '4.3938%2C51.9319%2C4.4038%2C51.9369';
        return `<div class="block-map"><iframe title="Kaart: Calandstraat 63, Schiedam" loading="lazy" ` +
            `src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&amp;layer=mapnik&amp;marker=51.934376%2C4.3988009"></iframe></div>`;
    }

    if (type === 'form') {
        // Same fields and order as the original, but in Dutch throughout and without the
        // newsletter checkbox or the "Hoe heet je" group heading, which the user dropped.
        // assets/js/contact.js posts it to /api/contact; see that file for what sending needs.
        return `<form class="block-form" id="contactForm" novalidate>
        <div class="form-row">
          <label class="form-field"><span class="form-title">Voornaam<span class="form-required">(vereist)</span></span><input type="text" name="firstName" autocomplete="given-name" required></label>
          <label class="form-field"><span class="form-title">Achternaam<span class="form-required">(vereist)</span></span><input type="text" name="lastName" autocomplete="family-name" required></label>
        </div>
        <label class="form-field"><span class="form-title">Je mail<span class="form-required">(vereist)</span></span><input type="email" name="email" autocomplete="email" required></label>
        <label class="form-field"><span class="form-title">Waar praten we over?<span class="form-required">(vereist)</span></span><input type="text" name="subject" required></label>
        <label class="form-field"><span class="form-title">Je bericht<span class="form-required">(vereist)</span></span><textarea name="message" rows="4" required></textarea></label>
        <button type="submit" class="form-submit">Stuur Nu</button>
        <p class="form-note" id="contactNote" role="status" hidden></p>
      </form>`;
    }

    // Squarespace draws underlines and circles around some words with script ("text
    // shapes"), placed at fixed pixels. Keep each shape's path and colour, and redraw it
    // inside its word below so it scales with the text.
    const shapes = new Map();
    block.find('.TextShape-node').each((i, el) => {
        const node = $(el);
        const id = node.attr('data-text-attribute-id');
        if (!id || shapes.has(id) || node.attr('data-index') !== '0') return;
        const style = node.attr('style') || '';
        const w = parseFloat((style.match(/width:\s*([\d.]+)px/) || [])[1]);
        const h = parseFloat((style.match(/height:\s*([\d.]+)px/) || [])[1]);
        const stroke = ((style.match(/--stroke:\s*([^;]+);/) || [])[1] || 'currentColor').trim();
        const d = node.find('path').attr('d');
        if (w && h && d) shapes.set(id, { w, h, stroke, d });
    });

    // text and anything else: keep the readable markup, drop Squarespace plumbing
    const holder = block.find('.sqs-html-content').first();
    const source = holder.length ? holder : inner;
    const copy = cheerio.load(`<div>${source.html() || ''}</div>`, null, false);
    const root = copy('div').first();
    root.find('script, style, .sqs-block-content-overlay').remove();
    // Number the text elements in order, so each can take its own measured size
    root.find('h1, h2, h3, h4, p, li, blockquote').each((i, el) => copy(el).addClass(`tx-${i}`));
    root.find('[data-text-attribute-id]').each((i, el) => {
        const shape = shapes.get(copy(el).attr('data-text-attribute-id'));
        if (!shape) return;
        copy(el).addClass('has-text-shape').append(
            `<svg class="text-shape" viewBox="0 0 ${shape.w} ${shape.h}" preserveAspectRatio="none" aria-hidden="true">` +
            `<path d="${shape.d}" stroke="${shape.stroke}"/></svg>`);
    });
    cleanAttributes(copy, root);
    root.find('a[href]').each((i, el) => {
        copy(el).attr('href', rewriteHref(copy(el).attr('href'), knownSlugs));
    });
    const html = root.html().trim();
    if (!html) return '';
    return `<div class="block-text">${html}</div>`;
}

// --- page -------------------------------------------------------------------------
// Sections that are not fluid-engine grids: image galleries, the portfolio grid and
// simple item lists. Returns '' for sections that are empty on the original too.
function convertPlainSection($, section, slug, knownSlugs) {
    const classes = section.attr('class') || '';

    if (classes.includes('gallery-section')) {
        // Squarespace offers several gallery layouts; this site uses two
        const layout = section.find('[class*="gallery-masonry"]').length ? 'masonry' : 'reel';
        const figures = [];
        section.find('img').each((i, el) => {
            const img = $(el);
            const local = localImage(img.attr('data-src') || img.attr('src'));
            if (!local) return;
            const alt = (img.attr('alt') || '').replace(/"/g, '&quot;');
            figures.push(`      <figure><img src="${local}" alt="${alt}" loading="lazy"></figure>`);
        });
        return figures.length ? `    <div class="gallery-${layout}">\n${figures.join('\n')}\n    </div>` : '';
    }

    const gridItems = section.find('.grid-item').filter((i, el) => $(el).find('img').length);
    if (gridItems.length) {
        const cards = [];
        gridItems.each((i, el) => {
            const item = $(el);
            const img = item.find('img').first();
            const local = localImage(img.attr('data-src') || img.attr('src'));
            const title = (item.find('h1, h2, h3, h4').first().text() || item.text()).replace(/\s+/g, ' ').trim().slice(0, 80);
            // The card itself is the link on the original, so check it before looking inside
            const target = item.is('a') ? item.attr('href') : item.find('a').first().attr('href');
            // Cards for pages the replica dropped go too, or they would link nowhere
            if (REMOVED_PAGES.has((target || '').replace(/^\/|\/$/g, '').replace(/\//g, '__'))) return;
            const link = rewriteHref(target, knownSlugs) || '#';
            if (link === '#') warnings.push(`${slug}: card "${title}" has no link`);
            const picture = local ? `<img src="${local}" alt="${title.replace(/"/g, '&quot;')}" loading="lazy">` : '';
            cards.push(`      <a class="grid-card" href="${link}">${picture}<span class="grid-card-title">${title}</span></a>`);
        });
        const intro = GRID_INTROS[slug];
        const heading = intro
            ? `    <div class="grid-intro">\n      <p>${intro.text}</p>\n    </div>\n`
            : '';
        return `${heading}    <div class="grid-cards">\n${cards.join('\n')}\n    </div>`;
    }

    // Item list: a large centred title over columns of items (the original's title is a
    // paragraph and its item titles are h2s, kept that way)
    const listItems = section.find('.list-item').filter((i, el) => $(el).text().trim());
    if (listItems.length) {
        const heading = section.find('.list-section-title').text().replace(/\s+/g, ' ').trim();
        const entries = [];
        listItems.each((i, el) => {
            const item = $(el);
            const title = item.find('h1, h2, h3, h4').first().text().replace(/\s+/g, ' ').trim();
            const text = item.find('p').first().text().replace(/\s+/g, ' ').trim();
            if (!title && !text) return;
            entries.push(`        <li>${title ? `<h2>${title}</h2>` : ''}${text ? `<p>${text}</p>` : ''}</li>`);
        });
        if (!entries.length) return '';
        return `    <div class="item-list">${heading ? `\n      <p class="item-list-title">${heading}</p>` : ''}\n      <ul>\n${entries.join('\n')}\n      </ul>\n    </div>`;
    }

    return '';
}

// Turns measurements of the live page into CSS, so text renders at the same size.
// Scaled text is sized by script on the original, so it becomes a share of the block
// width (cqw) here; everything else keeps its measured pixel size per breakpoint.
function typographyCss(blockClass, measured) {
    if (!measured) return '';
    const rules = [];

    for (const [breakpoint, data] of Object.entries(measured)) {
        const block = (data.blocks || data)[blockClass];
        if (!block) continue;
        const query = breakpoint === 'desktop' ? '(min-width: 768px)' : '(max-width: 767px)';
        const declarations = block.text.map((t, order) => {
            // Each text element is styled on its own: a block often mixes sizes
            const target = t.index === undefined ? t.tag : `.tx-${t.index}`;
            // On desktop the original's text grows with the window: 1rem plus a share of
            // the viewport width (checked from 800px to 2560px). Measurements are taken
            // at 1440px wide, so 1vw there is 14.4px.
            let size;
            if (block.scaled) size = `${(t.size / block.width * 100).toFixed(2)}cqw`;
            else if (breakpoint === 'desktop' && t.size > 16.05) size = `calc(1rem + ${((t.size - 16) / 14.4).toFixed(4)}vw)`;
            else size = `${t.size}px`;
            const parts = [`font-size: ${size}`];
            if (t.lineHeight && t.lineHeight !== 'normal') {
                parts.push(`line-height: ${(parseFloat(t.lineHeight) / t.size).toFixed(3)}`);
            }
            // Letter spacing scales with the text, so express it relative to the font size
            if (t.letterSpacing && t.letterSpacing !== 'normal') {
                parts.push(`letter-spacing: ${(parseFloat(t.letterSpacing) / t.size).toFixed(4)}em`);
            }
            if (t.weight && t.weight !== '400') parts.push(`font-weight: ${t.weight}`);
            if (t.align && t.align !== 'start') parts.push(`text-align: ${t.align}`);
            return `    .${blockClass} .block-text ${target} { ${parts.join('; ')}; }`;
        });
        if (block.scaled) declarations.unshift(`    .${blockClass} { container-type: inline-size; }`);
        if (declarations.length) rules.push(`@media ${query} {\n${declarations.join('\n')}\n}`);
    }

    return rules.join('\n');
}

// Sections have a minimum height and padding of their own on the live site, which the
// markup does not reveal. These come from the measurements.
function sectionCss(sectionId, measured) {
    if (!measured || !sectionId) return '';
    const selector = `#section-${sectionId.slice(-6)}`;
    const rules = [];

    // Colours as painted on the original. Themes come in more flavours than black and
    // white ("dark", ...), so take the measured result rather than the theme name.
    // The colour goes on the section's background layer, not the section itself, so a
    // divider can clip it and the next section's layer can reach up behind the cut.
    const desktop = measured.desktop && (measured.desktop.sections || []).find(s => s.id === sectionId);
    const colours = desktop && desktop.background;
    if (colours) {
        if (colours.text) rules.push(`${selector} { color: ${colours.text}; }`);
        if (colours.color) rules.push(`${selector} > .section-bg { background-color: ${colours.color}; }`);
    }
    // A section with a divider sits above the next one, like the original
    if (desktop && desktop.divider && desktop.divider.clip) rules.push(`${selector} { z-index: 3; }`);

    for (const [breakpoint, data] of Object.entries(measured)) {
        const section = (data.sections || []).find(s => s.id === sectionId);
        if (!section) continue;
        const top = section.padTop + section.wrapTop;
        const bottom = section.padBottom + section.wrapBottom;
        const parts = [];
        if (section.minHeight) parts.push(`min-height: ${section.minHeight}px`);
        if (top) parts.push(`padding-top: ${top}px`);
        if (bottom) parts.push(`padding-bottom: ${bottom}px`);

        const lines = [];
        if (parts.length) lines.push(`    ${selector} { ${parts.join('; ')}; }`);
        const bgTop = section.background && section.background.top;
        if (bgTop < 0) lines.push(`    ${selector} > .section-bg { top: ${bgTop}px; }`);
        if (section.divider && section.divider.clip) {
            lines.push(`    ${selector} > .section-bg { clip-path: url(#clip-${sectionId.slice(-6)}-${breakpoint}); }`);
        }
        if (!lines.length) continue;
        const query = breakpoint === 'desktop' ? '(min-width: 768px)' : '(max-width: 767px)';
        rules.push(`@media ${query} {\n${lines.join('\n')}\n}`);
    }

    return rules.join('\n');
}

// How bright a background photo or video is, 0 (black) to 1 (white), so the header can
// pick text that stays readable over it. ffmpeg decodes one frame down to a single pixel;
// the answers are cached, since they only change when the file does.
const LUMINANCE_CACHE = '_raw/luminance.json';
let luminanceCache = null;
function mediaLuminance(file) {
    if (!luminanceCache) {
        luminanceCache = fs.existsSync(LUMINANCE_CACHE) ? JSON.parse(fs.readFileSync(LUMINANCE_CACHE, 'utf8')) : {};
    }
    const key = `${file}@${fs.statSync(file).size}`;
    if (luminanceCache[key] !== undefined) return luminanceCache[key];

    const ffmpeg = require('ffmpeg-static');
    const pixel = require('child_process').spawnSync(ffmpeg, [
        '-v', 'error', '-i', file, '-frames:v', '1', '-vf', 'crop=iw:ih/6:0:0,scale=1:1', // the top strip, where the header sits
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'
    ]).stdout;
    const value = pixel && pixel.length >= 3
        ? (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255
        : 0.5; // unreadable file: leave the section's own theme in charge

    luminanceCache[key] = Math.round(value * 1000) / 1000;
    fs.writeFileSync(LUMINANCE_CACHE, JSON.stringify(luminanceCache, null, 2));
    return luminanceCache[key];
}

// A section's background image with its colour tint, as measured on the original.
// Background videos are not handled yet: they are streams that cannot be downloaded.
function sectionBackground($, section, sectionId, measured, slug, index) {
    const perBreakpoint = Object.entries(measured || {})
        .map(([bp, data]) => [bp, (data.sections || []).find(s => s.id === sectionId)])
        .filter(([, s]) => s);
    const m = (perBreakpoint.find(([bp]) => bp === 'desktop') || [])[1];
    const bg = (m && m.background) || {};

    const img = section.find('.section-background img').first();
    const local = img.length ? localImage(img.attr('data-src') || img.attr('src')) : null;

    // Background video: the original streams it, so the file has to be supplied by hand
    // in assets/video/, named <page>-section-<n>.<ext> (see assets/video/README.md)
    // A file placed here by hand wins: it plays even where the original had no video,
    // which is how a section can be given a different clip on purpose.
    const videoTypes = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
    const videoFile = Object.keys(videoTypes)
        .map(ext => `assets/video/${slug}-section-${index + 1}${ext}`)
        .find(file => fs.existsSync(file));

    // Divider shape per breakpoint, used to clip this section's background layer
    const clips = perBreakpoint
        .filter(([, s]) => s.divider && s.divider.clip)
        .map(([bp, s]) => `<clipPath id="clip-${sectionId.slice(-6)}-${bp}" clipPathUnits="objectBoundingBox"><path d="${s.divider.clip}"/></clipPath>`);
    const reachesUp = perBreakpoint.some(([, s]) => s.background && s.background.top < 0);
    const coloured = bg.color && !['rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)'].includes(bg.color);

    // White sections on the white page need no layer of their own
    if (!local && !videoFile && !clips.length && !reachesUp && !coloured) return '';

    const fit = (bg.image && bg.image.fit) || 'cover';
    const position = (bg.image && bg.image.position) || '50% 50%';
    const picture = local
        ? `<img src="${local}" alt="" loading="lazy" style="object-fit: ${fit}; object-position: ${position}">`
        : '';
    const movie = videoFile
        ? `<video class="section-bg-video" autoplay muted loop playsinline preload="metadata">` +
          `<source src="/${videoFile}" type="${videoTypes[path.extname(videoFile)]}"></video>`
        : '';
    const overlay = bg.overlay && parseFloat(bg.overlay.opacity) > 0
        ? `<div class="section-bg-overlay" style="background-color: ${bg.overlay.color}; opacity: ${bg.overlay.opacity}"></div>`
        : '';
    const defs = clips.length
        ? `<svg class="clip-defs" width="0" height="0" aria-hidden="true"><defs>${clips.join('')}</defs></svg>`
        : '';
    return `\n    <div class="section-bg" aria-hidden="true">${movie}${picture}${overlay}</div>${defs}`;
}

// The original's decorative section edge (a stroked wave), one shape per breakpoint
function dividerSvg(sectionId, measured) {
    if (!measured) return '';
    const paths = [];
    for (const [breakpoint, data] of Object.entries(measured)) {
        const section = (data.sections || []).find(s => s.id === sectionId);
        const divider = section && section.divider;
        if (!divider) continue;
        paths.push(`<path class="divider-${breakpoint}" d="${divider.d}" stroke="${divider.stroke}" stroke-width="${divider.width}"/>`);
    }
    return paths.length
        ? `\n    <svg class="section-divider" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">${paths.join('')}</svg>`
        : '';
}

// Converts every fluid-engine section inside `root` into clean HTML + the grid CSS
function convertSections($, root, slug, knownSlugs, warnings, measured, state) {
    const cssParts = [];
    const bodyParts = [];
    let firstTheme = null; // the header takes its colours from the first section

    // A dark video or photo behind the first section would swallow black header text,
    // so those pages get white text whatever theme the section declares
    let firstDark = false;
    const backgroundFor = (section, sectionId, i) => {
        const html = sectionBackground($, section, sectionId, measured, slug, i);
        if (!bodyParts.length) {
            const media = (html.match(/<(?:source|img) src="([^"]+)"/) || [])[1];
            const file = media && media.replace(/^\//, '');
            firstDark = !!(file && fs.existsSync(file) && mediaLuminance(file) < 0.5);
        }
        return html;
    };

    root.find('section.page-section').each((i, el) => {
        const section = $(el);
        // No theme set means the site default: white background, black text
        const theme = section.attr('data-section-theme') || 'white';
        const sectionId = section.attr('data-section-id') || `s${i}`;
        // Sections centre (or top/bottom align) their content within their minimum height
        const valign = ((section.attr('class') || '').match(/vertical-alignment--(\w+)/) || [, 'middle'])[1];
        const fluid = section.find('[data-fluid-engine]').first();
        const grid = fluid.find('.fluid-engine').first();
        if (!grid.length) {
            const plain = convertPlainSection($, section, slug, knownSlugs);
            if (plain) {
                bodyParts.push(`  <section class="page-section theme-${theme} valign-${valign}" id="section-${sectionId.slice(-6)}">${backgroundFor(section, sectionId, i)}\n${plain}${dividerSvg(sectionId, measured)}\n  </section>`);
                firstTheme = firstTheme || theme;
                const dimensions = sectionCss(sectionId, measured);
                if (dimensions) cssParts.push(dimensions);
            } else if (section.find('img').length || section.text().trim()) {
                warnings.push(`${slug}: section ${i + 1} has content in an unknown layout`);
            }
            return;
        }

        // The grid maths from the original, kept as-is, plus the section's own dimensions
        cssParts.push(fluid.find('style').first().html().trim());
        firstTheme = firstTheme || theme;
        const dimensions = sectionCss(sectionId, measured);
        if (dimensions) cssParts.push(dimensions);

        const blocks = [];
        grid.children('.fe-block').each((j, b) => {
            const block = $(b);
            const blockClass = (block.attr('class') || '').split(/\s+/).find(c => c.startsWith('fe-block-'));
            const converted = convertBlock($, block, warnings, slug, knownSlugs, state);
            if (!converted) return;
            const content = applyContentEdits(converted, blockClass, slug, warnings);
            blocks.push(`      <div class="fe-block ${blockClass}">${content}</div>`);
            const typography = typographyCss(blockClass, measured);
            if (typography) cssParts.push(typography);
        });

        const gridClass = (grid.attr('class') || '').split(/\s+/).find(c => c.startsWith('fe-')) || '';
        bodyParts.push(
            `  <section class="page-section theme-${theme} valign-${valign}" id="section-${sectionId.slice(-6)}">` +
            `${backgroundFor(section, sectionId, i)}\n` +
            `    <div class="fluid-engine ${gridClass}">\n${blocks.join('\n')}\n    </div>${dividerSvg(sectionId, measured)}\n` +
            `  </section>`
        );
    });

    return { css: cssParts.join('\n\n'), html: bodyParts.join('\n\n'), firstTheme: firstDark ? 'dark' : firstTheme };
}

// Prefer the browser-rendered copy: galleries, portfolio grids and blog listings are
// built by script, so the server's HTML is missing them.
function sourceFile(file) {
    const rendered = path.join(RENDERED_DIR, file);
    return fs.existsSync(rendered) ? rendered : path.join(PAGES_DIR, file);
}

function convertPage(file, knownSlugs, warnings) {
    const slug = pageSlug(file);
    const $ = cheerio.load(fs.readFileSync(sourceFile(file), 'utf8'));

    const title = ($('title').text() || '').replace(/\s+/g, ' ').trim();
    const description = $('meta[name="description"]').attr('content') || '';

    // How the live page renders its text, if it has been measured
    const measuredFile = path.join(MEASUREMENTS_DIR, `${slug}.json`);
    const measured = fs.existsSync(measuredFile) ? JSON.parse(fs.readFileSync(measuredFile, 'utf8')) : null;
    if (!measured) warnings.push(`${slug}: not measured yet, run tools/measure-live.js ${slug}`);

    // Page content and the site footer are both fluid-engine sections
    const state = { videos: 0 }; // counts video blocks, so their files can be numbered
    const main = $('#sections').length ? $('#sections') : $('main').first();
    const body = convertSections($, main, slug, knownSlugs, warnings, measured, state);
    // Footer sections are numbered separately, so their background files would be named
    // <page>-footer-section-<n>; without that they would pick up the page's own videos
    const footer = convertSections($, $('footer').first(), `${slug}-footer`, knownSlugs, warnings, measured, state);

    fs.mkdirSync(CSS_OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(CSS_OUT_DIR, `${slug}.css`), [body.css, footer.css].filter(Boolean).join('\n\n') + '\n');

    const html = slug === 'faqs' ? dropFaqs(body.html, warnings) : body.html;

    return { slug, title, description, body: html, footer: footer.html, headerTheme: body.firstTheme || 'white' };
}

// --- shell ------------------------------------------------------------------------
// Takes out links to pages the replica does not have, along with the line break that
// separated them from the link above in a footer list
function dropRemovedLinks(html) {
    for (const slug of REMOVED_PAGES) {
        const link = `<a href="/${slug}">[\\s\\S]*?</a>`;
        html = html
            .replace(new RegExp(`<span class="sqsrte-text-color--[a-z]+"><br></span>\\s*${link}`, 'g'), '')
            .replace(new RegExp(`${link}\\s*<span class="sqsrte-text-color--[a-z]+"><br></span>`, 'g'), '')
            .replace(new RegExp(`<li><a href="/${slug}">[\\s\\S]*?</a></li>`, 'g'), '')
            .replace(new RegExp(link, 'g'), '');
    }
    return html;
}

function renderPage({ slug, title, description, body, footer, headerTheme }, nav, fallbackFooter) {
    nav = nav.replace('class="site-header"', `class="site-header header-${headerTheme || 'white'}"`);
    body = dropRemovedLinks(body);
    const footerHtml = dropRemovedLinks(footer
        ? `<footer class="site-footer">\n${footer}\n</footer>`
        : fallbackFooter);
    // Only the page with the form loads the form's script
    const formScript = body.includes('id="contactForm"')
        ? '\n<script src="/assets/js/contact.js" defer></script>'
        : '';
    return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description.replace(/"/g, '&quot;')}">
<link rel="icon" href="/assets/images/5f1b031b-favicon.webp" type="image/webp">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/pages/${slug}.css">
<link rel="stylesheet" href="/assets/css/overrides.css">
</head>
<body>
${nav}
<main id="page">
${body}
</main>
${footerHtml}
<script src="/assets/js/site.js" defer></script>${formScript}
</body>
</html>
`;
}

function buildNav(knownSlugs) {
    const items = [
        ['Welkom', '/'],
        ['Over Ons', '/over-ons'],
        ['Disciplines', null, [
            ['Creatieve Artwork', '/creatieve-artwork'],
            ['Dans', '/dans'],
            ['Muziek', '/muziek'],
            ['Voetbal', '/voetbal']
        ]],
        ['Galerij', '/galerij'],
        ['Eindfestival', null, [
            ['Info', '/info'],
            ['Fotos Voorbereiding', '/fotos-voorbereiding']
        ]],
        ['Contact', '/contact']
    ];
    const render = ([label, url, children]) => children
        ? `      <li class="nav-folder"><button type="button" aria-expanded="false">${label}</button>
        <ul class="nav-submenu">${children.map(([l, u]) => `<li><a href="${u}">${l}</a></li>`).join('')}</ul>
      </li>`
        : `      <li><a href="${url}">${label}</a></li>`;

    return `<header class="site-header">
  <a class="site-tagline" href="/">&ldquo;Waar kunst, sport en jongerenkracht samenkomen&rdquo;</a>
  <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
  <nav id="site-nav" class="site-nav">
    <ul>
${items.map(render).join('\n')}
    </ul>
  </nav>
</header>`;
}

function buildFooter() {
    const links = [
        ['Cookies Beleid', '/cookies'],
        ['Algemene Voorwaarden', '/algemene-voorwaarden'],
        ['Privacy Statement', '/privacystatement'],
        ['FAQs', '/faqs'],
        ['Partners', '/partners'],
        ['Subsidieregelingen', '/subsidieregeling'],
        ['Klachten', '/klachten'],
        ['Contact', '/contact']
    ];
    return `<footer class="site-footer">
  <nav aria-label="Footer">
    <ul>${links.map(([l, u]) => `<li><a href="${u}">${l}</a></li>`).join('')}</ul>
  </nav>
  <p class="footer-note">&copy; ${new Date().getFullYear()} Artletics</p>
</footer>`;
}

// --- run --------------------------------------------------------------------------
const args = process.argv.slice(2);
const files = fs.readdirSync(PAGES_DIR)
    .filter(f => f.endsWith('.html') && !REMOVED_PAGES.has(pageSlug(f)));
const knownSlugs = new Set(files.map(pageSlug));
const targets = args.includes('--all')
    ? files
    : args.filter(a => !a.startsWith('--')).map(a => `${SLUG_TO_FILE[a] || a}.html`);

if (!targets.length) {
    console.log('usage: node tools/convert.js <slug> | --all');
    process.exit(1);
}

const warnings = [];
const nav = buildNav(knownSlugs);
const footer = buildFooter();

for (const file of targets) {
    if (!fs.existsSync(path.join(PAGES_DIR, file))) {
        console.log(`skip ${file} (not downloaded)`);
        continue;
    }
    const page = convertPage(file, knownSlugs, warnings);
    // The gallery and its sub-pages live under /galerij/ (see RENAMED_PAGES)
    const out = page.slug === HOME_SLUG ? 'index.html' : `${publicSlug(page.slug).replace(/__/g, '/')}.html`;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, renderPage(page, nav, footer));
    const blocks = (page.body.match(/class="fe-block /g) || []).length;
    console.log(`${out.padEnd(34)} ${blocks} blocks`);
}

if (warnings.length) {
    console.log(`\n${warnings.length} things need attention:`);
    [...new Set(warnings)].slice(0, 20).forEach(w => console.log('  -', w));
}
