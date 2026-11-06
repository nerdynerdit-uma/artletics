// The workshop catalogue behind /workshops/voor-scholen.
//
// Headings are the client's own wording. `flyers` lists the artwork for each workshop,
// by the file name it has in the delivery folder; the first one is the tile in the
// grid, the rest open behind it in the lightbox (girls/boys editions, variants).
//
// `lijn` is the workshop line the client groups the offer in, from the gemeente
// catalogue (Artletics in de Wijk, 2026-2027). The lines below are in that document's
// order, and so are the workshops inside each one.
//
// tools/build-workshops.js reads this file: it converts the flyers to web-sized WebP
// and writes the overview page plus one gallery page per line. Add a workshop here,
// drop its flyer in the source folder, rerun the tool.
//
// Source artwork (not in the repo, far too heavy):
//   Documents/Klanten/Stichting Facts/Artletics/2026/
//     wetransfer_artletics-plus-projectplan-2027-stichting-facts-pdf_2026-11-05_0926

// The four lines, each with the colour the client's own catalogue prints it in. Those
// four values were read straight out of that PDF, so they are the client's, not a
// guess: orange, purple, teal, green.
const LIJNEN = [
    {
        slug: 'maken-en-vakmanschap',
        nummer: 1,
        titel: 'Maken &amp; vakmanschap',
        plat: 'Maken en vakmanschap',
        kleur: '#ff7900',
        omschrijving: 'Met je handen werken en een vak van dichtbij zien: ontwerpen, '
            + 'spuiten, schilderen, knippen en stylen. Elke workshop levert iets op dat '
            + 'de deelnemers zelf gemaakt hebben.'
    },
    {
        slug: 'muziek-media-en-performance',
        nummer: 2,
        titel: 'Muziek, media &amp; performance',
        plat: 'Muziek, media en performance',
        kleur: '#7a27d8',
        omschrijving: 'Geluid, beeld en optreden: beats en teksten, draaien achter echte '
            + 'dj-apparatuur, filmen en monteren, en dansen. Van het eerste idee naar een '
            + 'presentatie of een korte eindproductie.'
    },
    {
        slug: 'sport-gezondheid-en-weerbaarheid',
        nummer: 3,
        titel: 'Sport, gezondheid &amp; weerbaarheid',
        plat: 'Sport, gezondheid en weerbaarheid',
        kleur: '#16b8bd',
        omschrijving: 'Bewegen in een positieve groep: voetbal, kickboksen, fitness en '
            + 'zelfverdediging. Techniek en conditie, maar net zo goed grenzen, respect '
            + 'en zelfvertrouwen. Van de meeste is een girls edition beschikbaar.'
    },
    {
        slug: 'gesprek-identiteit-en-sociale-kracht',
        nummer: 4,
        titel: 'Gesprek, identiteit &amp; sociale kracht',
        plat: 'Gesprek, identiteit en sociale kracht',
        kleur: '#19a957',
        omschrijving: 'Ruimte voor het gesprek: zelfbeeld, vriendschap, groepsdruk, '
            + 'emoties, keuzes en toekomst. In een kleine, veilige setting, met een eigen '
            + 'editie voor meisjes en voor jongens.'
    }
];

const WORKSHOPS = [
    // --- 1. Maken & vakmanschap -----------------------------------------------------
    {
        slug: 'design',
        lijn: 'maken-en-vakmanschap',
        titel: 'Design workshop',
        naam: 'Design It',
        omschrijving: 'Van idee naar een eigen ontwerp: kleur, vorm, logo en kleding.',
        flyers: ['Design-It-Artletics-flyer.png']
    },
    {
        slug: 'graffiti',
        lijn: 'maken-en-vakmanschap',
        titel: 'Graffiti workshop',
        naam: 'Urban Art',
        omschrijving: 'Van schets naar street art, met letters, kleur en techniek.',
        flyers: ['Urban-Art-Graffiti-Artletics-flyer.png']
    },
    {
        slug: 'schilder',
        lijn: 'maken-en-vakmanschap',
        titel: 'Schilder workshop',
        naam: 'Paint Your Story',
        omschrijving: 'Je eigen verhaal in kleur, met verschillende schildertechnieken.',
        flyers: ['Paint-Your-Story-Schilderen-Artletics-flyer-v2.png']
    },
    {
        slug: 'kapper',
        lijn: 'maken-en-vakmanschap',
        titel: 'Kapper workshop',
        naam: 'Cut It',
        omschrijving: 'De wereld van de herenkapper: knippen, contouren en hygiëne.',
        flyers: ['Cut-It-Herenkapper-Artletics-flyer.png']
    },
    {
        slug: 'hairstyling',
        lijn: 'maken-en-vakmanschap',
        titel: 'Hairstyling workshop',
        naam: 'Style It',
        omschrijving: 'Haar verzorgen, vlechten en stylen, met oog voor de klant.',
        flyers: ['Style-It-Dameskapper-Artletics-flyer.png']
    },

    // --- 2. Muziek, media & performance ---------------------------------------------
    {
        slug: 'dj',
        lijn: 'muziek-media-en-performance',
        titel: 'DJ workshop',
        naam: 'Mix It Up',
        omschrijving: 'Mixen, dj-skills en optreden achter echte dj-apparatuur.',
        flyers: ['Mix-It-Up-DJ-Workshop-Artletics-flyer.jpeg']
    },
    {
        slug: 'muziek',
        lijn: 'muziek-media-en-performance',
        titel: 'Muziek workshop',
        naam: 'Create Your Sound',
        omschrijving: 'Beats maken, teksten schrijven en experimenteren met stem en geluid.',
        flyers: ['Create-Your-Sound-Artletics-flyer.png']
    },
    {
        slug: 'social-media',
        lijn: 'muziek-media-en-performance',
        titel: 'Social media workshop',
        naam: 'Make It Social',
        omschrijving: 'Filmen, fotograferen en monteren, met oog voor online bewustzijn.',
        flyers: ['Make-It-Social-Artletics-flyer.png']
    },
    {
        slug: 'dance',
        lijn: 'muziek-media-en-performance',
        titel: 'Dance workshop',
        naam: 'Move It',
        omschrijving: 'Ritme, choreografie en je eigen manier van bewegen vinden.',
        flyers: ['Move-It-Artletics-flyer.png']
    },

    // --- 3. Sport, gezondheid & weerbaarheid ----------------------------------------
    {
        slug: 'voetbal',
        lijn: 'sport-gezondheid-en-weerbaarheid',
        titel: 'Voetbal workshop',
        naam: 'Kick It',
        omschrijving: 'Balcontrole, passing en techniek in een positieve groep.',
        flyers: [
            'Kick-It-Voetbal-Artletics-flyer.png',
            'Kick-It-Girls-Edition-Artletics-flyer.png'
        ]
    },
    {
        slug: 'kickboks',
        lijn: 'sport-gezondheid-en-weerbaarheid',
        titel: 'Kickboks workshop',
        naam: 'Own Your Power',
        omschrijving: 'Houding, focus en zelfbeheersing op pads en aan de bokszak.',
        flyers: [
            'Own-Your-Power-Kickboksen-Artletics-flyer.png',
            'Own-Your-Power-Girls-Edition-Artletics-flyer.png'
        ]
    },
    {
        slug: 'fitness',
        lijn: 'sport-gezondheid-en-weerbaarheid',
        titel: 'Fitness workshop',
        naam: 'Power Up',
        omschrijving: 'Fitness, voeding en mindset, met sportieve challenges in teamverband.',
        flyers: [
            'Power-Up-Artletics-definitief.png',
            'Power-Up-Girls-Edition-Artletics-flyer.png'
        ]
    },
    {
        slug: 'zelfverdediging',
        lijn: 'sport-gezondheid-en-weerbaarheid',
        titel: 'Zelfverdediging workshop',
        naam: 'Safe & Strong',
        omschrijving: 'Je grens herkennen, duidelijk nee zeggen en veilig handelen.',
        flyers: [
            'Safe-and-Strong-Artletics-flyer algemeen.png',
            'Safe-and-Strong-Boys-Edition-Artletics-flyer.png',
            'Safe-and-Strong-Girls-Edition-Artletics-flyer.png'
        ]
    },

    // --- 4. Gesprek, identiteit & sociale kracht ------------------------------------
    // The client's own catalogue lists Her Space and His Space as two separate
    // offerings, so they are two tiles here rather than one with both flyers behind it.
    {
        slug: 'praat-her',
        lijn: 'gesprek-identiteit-en-sociale-kracht',
        titel: 'Let’s Talk – Her Space',
        naam: 'Voor meisjes',
        omschrijving: 'Een veilige setting voor zelfbeeld, vriendschap, grenzen, keuzes '
            + 'en toekomst.',
        flyers: ['Lets-Talk-Her-Space-Artletics-flyer.png']
    },
    {
        slug: 'praat-his',
        lijn: 'gesprek-identiteit-en-sociale-kracht',
        titel: 'Let’s Talk – His Space',
        naam: 'Voor jongens',
        omschrijving: 'Een open setting voor identiteit, groepsdruk, emoties, respect en '
            + 'verantwoordelijkheid.',
        flyers: ['Lets-Talk-His-Space-Artletics-flyer.png']
    }
];

// Four ways the client offers the programme, from the same catalogue. They are on the
// overview page because they are how a school actually books: one workshop, a series,
// a holiday week, or a route through the neighbourhood.
const INZETVORMEN = [
    { titel: 'Kennismaking', tekst: '1 workshop of dagdeel' },
    { titel: 'Traject', tekst: '6 of 10 bijeenkomsten' },
    { titel: 'Impactweek', tekst: '3 tot 5 vakantiedagen' },
    { titel: 'Wijkroute', tekst: 'meerdere disciplines en partners' }
];

// In the catalogue but not in the flyer delivery, so they have no tile yet. Ask the
// client for the artwork and they drop straight into the list above.
const ZONDER_FLYER = [
    { naam: 'Caribbean Kitchen', lijn: 'maken-en-vakmanschap', wat: 'koken & cultuur' },
    { naam: 'Capture It', lijn: 'muziek-media-en-performance', wat: 'foto & video' }
];

// The only two flyers in the delivery that are not on the page. Both are the graffiti
// workshop again, but printed for one school: they carry a start date (woensdag 29
// oktober) and the address of the Yulius College. The general Urban Art flyer stands
// in for that workshop instead, so the page does not go stale.
const NIET_GEBRUIKT = [
    'Urban Art Graffiti Yulius.png',
    'graffiti flyer 2.png'
];

module.exports = { LIJNEN, WORKSHOPS, INZETVORMEN, ZONDER_FLYER, NIET_GEBRUIKT };
