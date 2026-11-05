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
| `node tools/apply-nav.js [--check]` | Put the current menu and asset stamps into every page, hand-written ones included |
| `node tools/build-workshops.js ["<folder>"]` | Convert the workshop flyers to WebP and write `workshops/voor-scholen.html` |
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
each page's own `header-*` theme, and touches nothing below the header, so it is safe to
run twice.

## Pages written by hand

`aanbod/*.html` and `workshops/*.html` have no Squarespace original behind them, so
`convert.js` neither builds nor overwrites them. They use `assets/css/plain-pages.css`
instead of a generated `assets/css/pages/<slug>.css` with Fluid Engine coordinates.
The text runs the full width of the page rather than in a reading column: the client
asked for that, so `--plain-max` is `none` and the paragraphs carry no `max-width`.

The two `aanbod/` pages still carry placeholder text drawn from the homepage copy,
marked as such on the page; the real content has to come from Artletics.

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

## The workshop gallery

`/workshops/voor-scholen` is generated: `tools/workshops.js` is the catalogue (heading,
blurb and flyer files per workshop) and `tools/build-workshops.js` converts the flyers
and writes the page. The source artwork is 2 MB PNGs delivered by the client and stays
out of the repo; each flyer becomes a 700px tile and a 1100px WebP in
`assets/images/workshops/` (6.5 MB for all 20, against 42 MB of originals). The lightbox
lives in `assets/js/flyers.js`, which the tool writes a link to but never overwrites.
Several flyers can sit behind one tile: `Kick It` has a girls edition, `Safe & Strong`
has three. 14 workshops; the lead sentence and the meta description count themselves, so
adding one to the catalogue needs no edit to the page.

Two delivered flyers are deliberately left out, both the graffiti workshop printed for
one school: they carry a start date and the Yulius College address, so the page would go
stale. `NIET_GEBRUIKT` in `tools/workshops.js` says so.

## The design

Dark theme: black sections, white text, a bright red/orange accent
(`hsl(1.6, 97%, 55%)`), plus green used in the wordmark.

Type: `"Helvetica Neue", Arial, sans-serif` everywhere (`--body-font`, exactly the
original's stack), except the menu, which is set in **Orbitron** (`--display-font`) at
the client's request — the square technical face used on their SpineTech brand. It is
self-hosted in `assets/fonts/`, one 11.8 KB variable file covering weights 400 to 900,
so the site still makes no third-party requests. Do not pull it from Google's CDN.

Squarespace lays pages out with **Fluid Engine**: each section is a CSS grid and every
block sits at explicit grid coordinates, with separate placements for desktop and mobile.
Those coordinates are the layout. Carry them over rather than guessing at spacing.

## Facts worth knowing

- The live site declares `lang="en-US"` while all content is Dutch. The replica uses
  `lang="nl"`.
- 25 pages: 14 in the root, 7 under `galerij/`, 2 under `aanbod/` and 2 under
  `workshops/`. The Eindfestival
  pages moved under the gallery (`/info` -> `/galerij/eindfestival`,
  `/fotos-voorbereiding` -> `/galerij/fotos-voorbereiding`), with redirects from the old
  addresses in `vercel.json`.
- No shop, membership or booking system. The only form is on Contact. It posts to
  `api/contact.js` (Vercel function, Resend), which needs RESEND_API_KEY and
  CONTACT_FROM set in Vercel; without them it answers that it is not connected yet
  and sends nothing. Mail goes to info@stichtingfacts.nl.
- Image blocks keep their own fit from the original: most show the whole image
  (`contain`, including the logo), some crop to fill (`cover`).
- Images are heavy (149 MB, mostly animated GIFs). Optimise before launch.
