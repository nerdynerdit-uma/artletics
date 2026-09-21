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
| `node tools/compare.js <slug> [mobile]` | Block-by-block position/size differences, rebuild vs live |
| `node tools/check-page.js <page>` | Broken images and failed requests on a local page |
| `node tools/check-colours.js [slug]` | Visible background colour of every section, live vs rebuild |
| `node tools/screenshot.js live [slug]` | Screenshot the live site, desktop + mobile |
| `node tools/screenshot.js local [slug]` | Screenshot the local rebuild for comparison |
| `npm run preview` | Local server at http://127.0.0.1:8000 |

Generated pages and `assets/css/pages/` are output: change the tools or `base.css`,
then rerun `convert.js --all`, rather than editing a page by hand.

## The design

Dark theme: black sections, white text, a bright red/orange accent
(`hsl(1.6, 97%, 55%)`), plus green used in the wordmark. Fonts are
`"Helvetica Neue", Arial, sans-serif` throughout, so no web fonts are needed.

Squarespace lays pages out with **Fluid Engine**: each section is a CSS grid and every
block sits at explicit grid coordinates, with separate placements for desktop and mobile.
Those coordinates are the layout. Carry them over rather than guessing at spacing.

## Facts worth knowing

- The live site declares `lang="en-US"` while all content is Dutch. The replica uses
  `lang="nl"`.
- 24 pages, including 6 portfolio sub-pages (Introductie Dag, Week 2 to Week 6).
- No shop, membership or booking system. The only form is on Contact. It posts to
  `api/contact.js` (Vercel function, Resend), which needs RESEND_API_KEY and
  CONTACT_FROM set in Vercel; without them it answers that it is not connected yet
  and sends nothing. Mail goes to info@stichtingfacts.nl.
- Image blocks keep their own fit from the original: most show the whole image
  (`contain`, including the logo), some crop to fill (`cover`).
- Images are heavy (149 MB, mostly animated GIFs). Optimise before launch.
