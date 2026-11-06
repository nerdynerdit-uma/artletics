// The site menu, in one place.
//
// Both tools/convert.js (which rebuilds the Squarespace pages) and tools/apply-nav.js
// (which refreshes the header in every page, including the hand-written ones that have
// no Squarespace original) read the menu from here. Change it here and nowhere else,
// then run:
//
//   node tools/convert.js --all
//   node tools/apply-nav.js
//
// An item is [label, url] for a plain link, or [label, null, children] for a folder.
// A folder's button is not a link, exactly as on the live site: Disciplines behaves
// that way too. The home page is reached through the tagline in the header.

const NAV_ITEMS = [
    ['Aanbod', null, [
        ['Kinderen, jongeren & ouders', '/aanbod/kinderen-jongeren-ouders'],
        ['Scholen, gemeenten & organisaties', '/aanbod/scholen-gemeenten-organisaties']
    ]],
    ['Over Ons', '/over-ons'],
    ['Disciplines', null, [
        ['Creatieve Artwork', '/creatieve-artwork'],
        ['Dans', '/dans'],
        ['Muziek', '/muziek'],
        ['Voetbal', '/voetbal']
    ]],
    ['Workshops', null, [
        ['Artletics Plus', '/workshops/artletics-plus'],
        ['Artletics voor Scholen', '/workshops/voor-scholen'],
        ['Artletics in de Wijk', '/workshops/in-de-wijk']
    ]],
    ['Galerij', null, [
        ['Galerij', '/galerij'],
        ['Eindfestival', '/galerij/eindfestival'],
        ['Fotos Voorbereiding', '/galerij/fotos-voorbereiding']
    ]],
    ['Contact', '/contact']
];

const TAGLINE = '&ldquo;Waar kunst, sport en jongerenkracht samenkomen&rdquo;';

function renderItem([label, url, children]) {
    return children
        ? `      <li class="nav-folder"><button type="button" aria-expanded="false">${label}</button>
        <ul class="nav-submenu">${children.map(([l, u]) => `<li><a href="${u}">${l}</a></li>`).join('')}</ul>
      </li>`
        : `      <li><a href="${url}">${label}</a></li>`;
}

// theme is 'white', 'black' or 'dark'; convert.js passes it per page.
function buildNav(theme) {
    const cls = 'site-header' + (theme ? ` header-${theme}` : '');
    return `<header class="${cls}">
  <a class="site-tagline" href="/">${TAGLINE}</a>
  <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
  <nav id="site-nav" class="site-nav">
    <ul>
${NAV_ITEMS.map(renderItem).join('\n')}
    </ul>
  </nav>
</header>`;
}

module.exports = { NAV_ITEMS, TAGLINE, buildNav };
