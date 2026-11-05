// The flyer lightbox on /workshops/voor-scholen.
//
// Each tile carries its flyers in data-flyers, separated by a pipe: one workshop can
// have several (a girls or boys edition, a variant). Opening a tile shows the first and
// the arrows step through the rest.
//
// Without JavaScript the tiles are still there with their headings and descriptions;
// only the enlarged view is missing. tools/build-workshops.js writes the page but never
// this file.

(function () {
    const venster = document.getElementById('flyerVenster');
    if (!venster) return;

    const beeld = document.getElementById('flyerBeeld');
    const bijschrift = document.getElementById('flyerBijschrift');
    const vorige = venster.querySelector('.flyer-vorige');
    const volgende = venster.querySelector('.flyer-volgende');
    const sluiten = venster.querySelector('.flyer-sluit');
    const knoppen = [...document.querySelectorAll('.flyer-knop')];

    let flyers = [];
    let titel = '';
    let nu = 0;
    let kwamVan = null;

    function toon(i) {
        nu = (i + flyers.length) % flyers.length;
        beeld.src = flyers[nu];
        beeld.alt = flyers.length > 1
            ? `${titel}, versie ${nu + 1} van ${flyers.length}`
            : titel;
        bijschrift.textContent = flyers.length > 1
            ? `${titel} — ${nu + 1} van ${flyers.length}`
            : titel;
        const meerdere = flyers.length > 1;
        vorige.hidden = !meerdere;
        volgende.hidden = !meerdere;
    }

    function open(knop) {
        flyers = (knop.dataset.flyers || '').split('|').filter(Boolean);
        titel = knop.dataset.titel || 'Flyer';
        if (!flyers.length) return;
        kwamVan = knop;
        venster.hidden = false;
        document.body.classList.add('flyer-open');
        toon(0);
        sluiten.focus();
    }

    function dicht() {
        venster.hidden = true;
        document.body.classList.remove('flyer-open');
        beeld.src = '';
        if (kwamVan) kwamVan.focus();
        kwamVan = null;
    }

    knoppen.forEach(knop => knop.addEventListener('click', () => open(knop)));
    sluiten.addEventListener('click', dicht);
    vorige.addEventListener('click', () => toon(nu - 1));
    volgende.addEventListener('click', () => toon(nu + 1));

    // Clicking the backdrop closes; clicking the flyer itself does not
    venster.addEventListener('click', e => {
        if (e.target === venster) dicht();
    });

    document.addEventListener('keydown', e => {
        if (venster.hidden) return;
        if (e.key === 'Escape') dicht();
        if (e.key === 'ArrowLeft') toon(nu - 1);
        if (e.key === 'ArrowRight') toon(nu + 1);
        // Keep the tab ring inside the dialog while it is open
        if (e.key === 'Tab') {
            const binnen = [sluiten, vorige, volgende].filter(k => !k.hidden);
            const i = binnen.indexOf(document.activeElement);
            e.preventDefault();
            const volgendeIndex = e.shiftKey
                ? (i <= 0 ? binnen.length - 1 : i - 1)
                : (i + 1) % binnen.length;
            binnen[volgendeIndex].focus();
        }
    });
})();
