// The workshop catalogue behind /workshops/voor-scholen.
//
// Headings are the client's own wording. `flyers` lists the artwork for each workshop,
// by the file name it has in the delivery folder; the first one is the tile in the
// grid, the rest open behind it in the lightbox (girls/boys editions, variants).
//
// tools/build-workshops.js reads this file: it converts the flyers to web-sized WebP
// and writes the gallery page. Add a workshop here, drop its flyer in the source
// folder, rerun the tool.
//
// Source artwork (not in the repo, far too heavy):
//   Documents/Klanten/Stichting Facts/Artletics/2026/
//     wetransfer_artletics-plus-projectplan-2027-stichting-facts-pdf_2026-11-05_0926

const WORKSHOPS = [
    {
        slug: 'muziek',
        titel: 'Muziek workshop',
        naam: 'Create Your Sound',
        omschrijving: 'Beats maken, teksten schrijven en experimenteren met stem en geluid.',
        flyers: ['Create-Your-Sound-Artletics-flyer.png']
    },
    {
        slug: 'design',
        titel: 'Design workshop',
        naam: 'Design It',
        omschrijving: 'Van idee naar een eigen ontwerp: kleur, vorm, logo en kleding.',
        flyers: ['Design-It-Artletics-flyer.png']
    },
    {
        slug: 'graffiti',
        titel: 'Graffiti workshop',
        naam: 'Urban Art',
        omschrijving: 'Van schets naar street art, met letters, kleur en techniek.',
        flyers: ['Urban-Art-Graffiti-Artletics-flyer.png']
    },
    {
        slug: 'voetbal',
        titel: 'Voetbal workshop',
        naam: 'Kick It',
        omschrijving: 'Balcontrole, passing en techniek in een positieve groep.',
        flyers: [
            'Kick-It-Voetbal-Artletics-flyer.png',
            'Kick-It-Girls-Edition-Artletics-flyer.png'
        ]
    },
    {
        slug: 'kapper',
        titel: 'Kapper workshop',
        naam: 'Cut It',
        omschrijving: 'De wereld van de herenkapper: knippen, contouren en hygiëne.',
        flyers: ['Cut-It-Herenkapper-Artletics-flyer.png']
    },
    {
        slug: 'hairstyling',
        titel: 'Hairstyling workshop',
        naam: 'Style It',
        omschrijving: 'Haar verzorgen, vlechten en stylen, met oog voor de klant.',
        flyers: ['Style-It-Dameskapper-Artletics-flyer.png']
    },
    {
        slug: 'schilder',
        titel: 'Schilder workshop',
        naam: 'Paint Your Story',
        omschrijving: 'Je eigen verhaal in kleur, met verschillende schildertechnieken.',
        flyers: ['Paint-Your-Story-Schilderen-Artletics-flyer-v2.png']
    },
    {
        slug: 'kickboks',
        titel: 'Kickboks workshop',
        naam: 'Own Your Power',
        omschrijving: 'Houding, focus en zelfbeheersing op pads en aan de bokszak.',
        flyers: [
            'Own-Your-Power-Kickboksen-Artletics-flyer.png',
            'Own-Your-Power-Girls-Edition-Artletics-flyer.png'
        ]
    },
    {
        slug: 'zelfverdediging',
        titel: 'Zelfverdediging workshop',
        naam: 'Safe & Strong',
        omschrijving: 'Je grens herkennen, duidelijk nee zeggen en veilig handelen.',
        flyers: [
            'Safe-and-Strong-Artletics-flyer algemeen.png',
            'Safe-and-Strong-Boys-Edition-Artletics-flyer.png',
            'Safe-and-Strong-Girls-Edition-Artletics-flyer.png'
        ]
    },
    {
        slug: 'dance',
        titel: 'Dance workshop',
        naam: 'Move It',
        omschrijving: 'Ritme, choreografie en je eigen manier van bewegen vinden.',
        flyers: ['Move-It-Artletics-flyer.png']
    },
    {
        slug: 'dj',
        titel: 'DJ workshop',
        naam: 'Mix It Up',
        omschrijving: 'Mixen, dj-skills en optreden achter echte dj-apparatuur.',
        flyers: ['Mix-It-Up-DJ-Workshop-Artletics-flyer.jpeg']
    },
    {
        slug: 'praat',
        titel: 'Praat workshop',
        naam: 'Let’s Talk',
        omschrijving: 'Een open gesprek over identiteit, grenzen en vriendschap.',
        flyers: [
            'Lets-Talk-His-Space-Artletics-flyer.png',
            'Lets-Talk-Her-Space-Artletics-flyer.png'
        ]
    },
    {
        slug: 'fitness',
        titel: 'Fitness workshop',
        naam: 'Power Up',
        omschrijving: 'Fitness, voeding en mindset, met sportieve challenges in teamverband.',
        flyers: [
            'Power-Up-Artletics-definitief.png',
            'Power-Up-Girls-Edition-Artletics-flyer.png'
        ]
    },
    {
        slug: 'social-media',
        titel: 'Social media workshop',
        naam: 'Make It Social',
        omschrijving: 'Filmen, fotograferen en monteren, met oog voor online bewustzijn.',
        flyers: ['Make-It-Social-Artletics-flyer.png']
    }
];

// The only two flyers in the delivery that are not on the page. Both are the graffiti
// workshop again, but printed for one school: they carry a start date (woensdag 29
// oktober) and the address of the Yulius College. The general Urban Art flyer stands
// in for that workshop instead, so the page does not go stale.
const NIET_GEBRUIKT = [
    'Urban Art Graffiti Yulius.png',
    'graffiti flyer 2.png'
];

module.exports = { WORKSHOPS, NIET_GEBRUIKT };
