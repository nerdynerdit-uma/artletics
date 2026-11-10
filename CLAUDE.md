# Artletics — artletics.nl

Static replica of the Artletics site, a Dutch cultural programme for young people
(art, music, creative artwork, dance and football). Being rebuilt off Squarespace.

## Stack

Hand-authored static HTML, one file per page in the repo root, plain CSS in `assets/css/`,
images in `assets/images/`. No framework, no bundler, no build step for the site itself.
`package.json` exists only for developer tooling (`puppeteer-core`) and is not shipped.

## Source material

- `_raw/pages/*.html` — the live Squarespace page for every URL in the sitemap
- `_raw/css/` — the stylesheets the live site loads; `_raw/home-inline.css` holds the
  per-page inline CSS, which is where Fluid Engine grid placements live
- `_raw/screens/` — reference screenshots (`live-*`) and rebuild screenshots (`local-*`),
  not committed
- `_raw/image-manifest.json` — every downloaded image mapped back to its original URL

## Tools

| Command | Does |
|---|---|
| `node tools/fetch-images.js` | Re-download images listed in `_raw/image-urls.txt` |
| `node tools/fetch-rendered.js [slug]` | Save live pages as rendered after scripts run, into `_raw/rendered/` |
| `node tools/measure-live.js <slug> \| --all` | Measure live text sizes and section heights into `_raw/measurements/` |
| `node tools/convert.js <slug> \| --all` | Build the static pages from the rendered copies and measurements |
| `node tools/apply-nav.js [--check]` | Put the current menu, the footer band and the asset stamps into every page, hand-written ones included |
| `node tools/build-workshops.js ["<folder>"]` | Convert the workshop flyers to WebP and write the ten Artletics voor Scholen pages |
| `node tools/plus-beelden.js ["<plan.pdf>"]` | Pull the four discipline illustrations out of the Artletics+ project plan |
| `node tools/compare.js <slug> [mobile]` | Block-by-block position/size differences, rebuild vs live |
| `node tools/check-page.js <page>` | Broken images and failed requests on a local page |
| `node tools/check-colours.js [slug]` | Visible background colour of every section, live vs rebuild |
| `node tools/screenshot.js live [slug]` | Screenshot the live site, desktop + mobile |
| `node tools/screenshot.js local [slug]` | Screenshot the local rebuild for comparison |
| `npm run preview` | Local server at http://127.0.0.1:8000 |

Generated pages and `assets/css/pages/` are output: change the tools or `base.css`,
then rerun `convert.js --all`, rather than editing a page by hand.

## The menu

`tools/nav.js` holds the menu, and nothing else does. `convert.js` reads it while it
rebuilds the Squarespace pages; `apply-nav.js` walks every page on disk, so the
hand-written ones (see below) stay in step too. After changing `tools/nav.js`:

```
node tools/convert.js --all
node tools/apply-nav.js
```

`apply-nav.js` also refreshes the `?v=` stamps on the stylesheets and the script, keeps
each page's own `header-*` theme, and touches nothing between the header and the footer,
so it is safe to run twice.

It puts one more thing on every page: the **band at the head of the footer**, with the
Direct aanmelden button. `FOOTER_CTA` in that file is the markup. It is not a block in
the Fluid Engine grid under it — that grid carries coordinates measured on the live site,
and a new block would need placements of its own — so it sits above the grid and brings
its own colours. An existing band is removed before the new one goes in, so editing the
text there is enough. `aanmelden.html` is the one page that does not get one.

The menu folds into the hamburger below **1149px**, not at the 767px the rest of the
mobile styling uses: the tagline and six items in Orbitron need about 1150px beside each
other, and below that the header used to break onto two ragged lines. That one media
query in `base.css` is deliberately separate from the 767px block, which carries the
original's type sizes.

## Pages written by hand

`aanbod/*.html` and `workshops/*.html` have no Squarespace original behind them, so
`convert.js` neither builds nor overwrites them. They use `assets/css/plain-pages.css`
instead of a generated `assets/css/pages/<slug>.css` with Fluid Engine coordinates.
The text runs the full width of the page rather than in a reading column: the client
asked for that, so `--plain-max` is `none` and the paragraphs carry no `max-width`.

The two `aanbod/` pages still carry placeholder text drawn from the homepage copy,
marked as such on the page; the real content has to come from Artletics.

`aanmelden.html` is the sign-up page the footer band points at, modelled on a page the
client pointed to: step 1 is the role you come from (school, gemeente or wijkteam,
woonzorglocatie, wijkpartner, or a young person or parent), step 2 the details. Those
five roles are the audiences the rest of the site already addresses, not the reference's
own list. It posts to `/api/contact`, the same endpoint and the same mailbox as the
contact form, with the role and the programme folded into the subject and the message, so
there is one mail service to keep working rather than two.

`workshops/in-de-wijk.html` is the client's gemeente catalogue, *Artletics in de Wijk
2026-2027*, pages 6 to 8: what Artletics brings to a neighbourhood, the Impactweek, and
what a gemeente, school or partner has taken off their hands. The catalogue's own
contact block is not on it — the site is the website it points at, and the footer already
carries the address, phone and mail — so that block is the contact button instead. Pages
1 to 5 of the same catalogue are the four workshop lines, and live under Artletics voor
Scholen rather than here.

`workshops/artletics-plus.html` is the client's own project plan (Artletics Plus
Projectplan 2027) as a web page: every chapter except the closing contact and image
credits, which the client asked to leave out. The four disciplines halfway down are the
chapter openers of pages 7 to 10 — Power Up, Move It, Create Your Sound and Design It —
and they use the same lightbox as the flyer gallery.

The plan is an appendix to a funding application, so a good deal of it is written for
the fund, not for a visitor. That part is deliberately off the page and the client
confirmed every cut: the budget and the own contribution, the four hours of staff time
behind each workshop, the attendance-moment count, the task split around invoices and
accounting, the volunteer hours and expenses, the reporting paragraphs under Monitoring,
the summary table of application details, the chapter on building on the school
programme, the evaluation questions, and the chapters on risks and on the follow-up.
The funder is not named anywhere. Leave it that way unless the client asks otherwise.
`node tools/plus-beelden.js` reads those four illustrations straight out of the PDF
(1378x919 raw RGB, Flate-compressed, in page order) and writes them to
`assets/images/artletics-plus/` as a tile and a full-size WebP, 865 KB in all. They are
AI-generated, which the plan states under each one, so the page and the lightbox
caption say so too. Do not present them as photographs of participants.

## Artletics voor Scholen

Ten generated pages: `tools/workshops.js` is the catalogue (the four workshop lines,
and per workshop its line, heading, blurb and flyer files), `tools/workshop-detail.js`
holds the long-form copy for a single workshop, and `tools/build-workshops.js` converts
the flyers and writes them all.

`/workshops/voor-scholen` is the overview the menu points at, and holds no flyers of its
own: four blocks, one per workshop line, each showing the first flyers of that line as a
preview strip. Behind each one is its own gallery at `/workshops/<line>`, which carries
the flyer grid and the lightbox and links on to the other three lines. The lines, their
order and the four colours (orange, purple, teal, green) come from the client's gemeente
catalogue, *Artletics in de Wijk 2026-2027*; the colours were read out of that PDF rather
than guessed. Those colours appear nowhere else on the site, which is otherwise black,
white and the red accent.

### A page per poster

A workshop can have a page of its own at `/workshops/<brand name>`, for instance
`/workshops/design-it`. The five workshops of *Maken & vakmanschap* have one; the other
ten do not yet. Whether a workshop gets one is decided by a single thing: an entry in
`DETAILS` in `tools/workshop-detail.js`. With an entry, the poster in the gallery turns
from a button that enlarges the flyer into a link to that page, and the gallery stops
loading the lightbox once no tile on it needs one any more. Without an entry, nothing
about that tile changes. Writing the copy is therefore the whole job of adding a page.

The point of the page is the row of four icons along the foot of every poster: the page
repeats them and says what each one actually means, which is what the client asked for.
The icons are **cut out of the artwork**, not redrawn — the client asked for exactly the
poster's own, and a lookalike was rejected. `ICOONBAND` in `tools/build-workshops.js`
says where the strip sits on each poster, as a fraction of the cropped flyer, measured
off the artwork with a grid; the four boxes are then found inside that band and written
to `assets/images/workshops/iconen/` (20 files, 88 KB). The order of `iconen` in
`tools/workshop-detail.js` is the order they appear on the poster, left to right, and
that is what pairs a drawing with its explanation.

Two things about that band. Its sides are forgiving, but **its bottom edge is not**: on
several posters the label begins one single row under the icon, so there is no gap to
find and that edge is the only thing keeping the two apart. And it is measured against
the *cropped* flyer, so changing `witteVoet()` invalidates it. Finding anything other
than four icons stops the build rather than cutting the wrong thing quietly.

There is no caption under the poster telling people it enlarges; the client asked for
that line to go. Clicking it still opens the lightbox.

Under that sit the practical details, `FEITEN`: lesson days, hours, 20 sessions of 1,5
hours, 30 hours in all, once a fortnight. They are set as labelled blocks rather than
a bulleted list, after a page the client pointed to (stichtingmaeh.nl). They are the
same for both ways of taking part, so they stand above the two cards instead of being
repeated in each. 13.00 to 21.00 is the window lessons are planned in, not the length
of one, and `FEITEN_NOOT` says so — without that line the window reads as an eight-hour
lesson. There is no location block: the only address the site carries is the
foundation's own visiting address, which is not where the lessons are.

`LESVORMEN` then holds only what differs between the two: Groepslessen at &euro;450 with
professional tutors, and Small Groups at &euro;700 with three participants at most and
one-to-one attention. The client's own copy, the same on every workshop page, so it
lives in one place.

Let's Talk is two tiles, Her Space and His Space, because the catalogue lists them as two
offerings. Two workshops in that catalogue have no artwork in the flyer delivery and are
therefore on no page: Caribbean Kitchen and Capture It. `ZONDER_FLYER` in
`tools/workshops.js` says so; add the flyers and they drop straight in. The source artwork is 2 MB PNGs delivered by the client and stays
out of the repo; each flyer becomes a 700px tile and a 1100px WebP in
`assets/images/workshops/` (6.2 MB for all 20, against 42 MB of originals). The lightbox
lives in `assets/js/flyers.js`, which the tool writes a link to but never overwrites.

The white band at the foot of every flyer — the two logos and www.artletics.nl — is cut
off: on the website itself it states the obvious. `witteVoet()` finds it by reading the
flyer as a small grey image and walking up from the bottom while the rows stay light,
which lands between 6 and 8 per cent on every flyer. The DJ one ends in a diagonal
white shape rather than a band, so its cut is given by hand in `VOET_HANDMATIG`. The
cropped flyers run 1.27 to 1.41 times as tall as they are wide; `.flyer-knop` sits at
1:1.32, between the two, and the photographs have square corners.
Several flyers can sit behind one tile: `Kick It` has a girls edition, `Safe & Strong`
has three. 15 workshops; the lead sentence and every meta description count and name
themselves, so adding one to the catalogue needs no edit to a page.

Two delivered flyers are deliberately left out, both the graffiti workshop printed for
one school: they carry a start date and the Yulius College address, so the page would go
stale. `NIET_GEBRUIKT` in `tools/workshops.js` says so.

## The design

Dark theme: black sections, white text, a bright red/orange accent
(`hsl(1.6, 97%, 55%)`), plus green used in the wordmark.

Type: `"Helvetica Neue", Arial, sans-serif` everywhere (`--body-font`, exactly the
original's stack), except the header — menu and tagline — and the page titles on the
hand-written pages, which are set in **Orbitron** (`--display-font`) at the client's
request: the square technical face used on their SpineTech brand. It is
self-hosted in `assets/fonts/`, one 11.8 KB variable file covering weights 400 to 900,
so the site still makes no third-party requests. Do not pull it from Google's CDN.

Squarespace lays pages out with **Fluid Engine**: each section is a CSS grid and every
block sits at explicit grid coordinates, with separate placements for desktop and mobile.
Those coordinates are the layout. Carry them over rather than guessing at spacing.

## Facts worth knowing

- The live site declares `lang="en-US"` while all content is Dutch. The replica uses
  `lang="nl"`.
- 36 pages: 15 in the root, 7 under `galerij/`, 2 under `aanbod/` and 12 under
  `workshops/`. The Eindfestival
  pages moved under the gallery (`/info` -> `/galerij/eindfestival`,
  `/fotos-voorbereiding` -> `/galerij/fotos-voorbereiding`), with redirects from the old
  addresses in `vercel.json`.
- No shop, membership or booking system. Two forms, on Contact and on Aanmelden, and
  both post to `api/contact.js` (Vercel function, Resend), which mails
  info@stichtingfacts.nl. It needs RESEND_API_KEY and CONTACT_FROM in Vercel; without
  them it answers that it is not connected and sends nothing, and it never reports a
  success Resend did not give it. **Those variables are set and it works**: a real
  sign-up sent through the preview on 2026-11-10 came back `200 {"ok":true}`, which is
  Resend accepting the message. Earlier notes in this file said it was still
  unconnected; that was out of date. Only the Preview environment was proved, though —
  Vercel keeps Production variables separately, so a test through www.artletics.nl is
  still owed.
- Image blocks keep their own fit from the original: most show the whole image
  (`contain`, including the logo), some crop to fill (`cover`).
- Images are heavy (149 MB, mostly animated GIFs). Optimise before launch.
