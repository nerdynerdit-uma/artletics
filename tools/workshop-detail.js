// The long-form content behind one workshop: the page you land on when you click a
// poster in a gallery.
//
// tools/workshops.js stays the short catalogue (which workshop, which line, which
// flyer files). This file holds the prose, which is far longer, so the catalogue
// remains readable. tools/build-workshops.js writes a detail page for every workshop
// that appears in DETAILS and leaves the others as they were: a tile that opens the
// flyer in the lightbox. Add an entry here and the tile turns into a link by itself.
//
// Everything below is PLAIN text, with real &, é and ’. The builder runs it through
// esc(), so writing entities here would escape them twice.

// The hard facts, set out as labelled blocks the way the client asked for, after a
// page she pointed to. They are the same for both ways of joining, so they stand above
// the two cards instead of being listed twice.
//
// 13.00 to 21.00 is the window the lessons are planned in, not the length of one: a
// lesson is 1,5 hours and which slot you get depends on age and group. That is what
// FEITEN_NOOT says, and without it the window reads as an eight-hour lesson.
const FEITEN = [
    { icoon: 'kalender', label: 'Lesdagen', waarde: 'maandag, woensdag en zondag' },
    { icoon: 'klok', label: 'Lestijden', waarde: '13.00 tot 21.00 uur' },
    { icoon: 'kalendervink', label: 'Aantal sessies', waarde: '20' },
    { icoon: 'zandloper', label: 'Lesduur', waarde: '1,5 uur' },
    { icoon: 'stapel', label: 'Totaal', waarde: '30 lesuren' },
    { icoon: 'herhaal', label: 'Frequentie', waarde: 'om de week' }
];

const FEITEN_NOOT = {
    label: 'Lestijden op basis van leeftijd',
    tekst: 'De exacte lestijd wordt na aanmelding bepaald, op basis van leeftijd en '
        + 'groepsindeling.'
};

// The two ways a participant can join. The client supplied this wording; it is the
// same on every workshop page, so it lives here once. Only what differs between the
// two is listed here — everything they have in common is in FEITEN above.
const LESVORMEN = [
    {
        naam: 'Groepslessen',
        slogan: 'Samen ontdekken en groeien!',
        tekst: 'Samen met andere kinderen en jongeren volg je inspirerende culturele '
            + 'lessen waarin creativiteit, plezier, samenwerking en persoonlijke '
            + 'ontwikkeling centraal staan.',
        punten: [
            'Begeleiding door ervaren vakprofessionals',
            'Inclusief materialen'
        ],
        prijs: '€ 450,-',
        prijsWat: 'jaarcontributie per deelnemer'
    },
    {
        naam: 'Small Groups',
        slogan: 'Meer aandacht, meer ontwikkeling!',
        tekst: 'Wil je graag extra persoonlijke begeleiding? Kies dan voor onze Small '
            + 'Groups met maximaal drie deelnemers. In deze kleine groepen is er meer '
            + 'ruimte om op jouw tempo te leren, nieuwe technieken te oefenen en jouw '
            + 'creatieve talent verder te ontwikkelen.',
        punten: [
            'Maximaal 3 deelnemers per groep',
            'Intensieve, persoonlijke begeleiding',
            'Inclusief materialen'
        ],
        prijs: '€ 700,-',
        prijsWat: 'jaarcontributie per deelnemer'
    }
];

// Per workshop:
//   pad     the address, /workshops/<pad>. The brand name on the poster, not the
//           catalogue slug, because that is what a visitor just clicked on.
//   kreet   the line under the title on the poster
//   kop     the orange heading on the poster
//   intro   the paragraph under it, the client's own copy
//   iconen  the four icons along the foot of the poster, each with what it actually
//           means. THE ORDER MATTERS: the icon images are cut straight out of the
//           artwork, left to right, and paired with this list in the same order.
const DETAILS = {
    // --- 1. Maken & vakmanschap -----------------------------------------------------
    design: {
        pad: 'design-it',
        kreet: 'Bedenk. Ontwerp. Creëer.',
        kop: 'Van idee naar jouw eigen ontwerp',
        intro: 'Ontdek hoe kleur, vorm, logo’s, kleding en branding samenkomen. '
            + 'Ontwikkel je eigen stijl en zet jouw ideeën om in een krachtig ontwerp. '
            + 'Ervaring is niet nodig: creativiteit en plezier staan centraal.',
        iconen: [
            {
                label: 'Logo & branding',
                uitleg: 'Een logo is meer dan een plaatje: het is het gezicht van een '
                    + 'merk. Je leert hoe vorm, kleur en lettertype samen één herkenbaar '
                    + 'teken worden, en je ontwerpt er zelf een — voor een eigen merk, '
                    + 'een team of een idee dat van jou is.'
            },
            {
                label: 'Kledingdesign',
                uitleg: 'Een ontwerp op papier is iets anders dan een ontwerp op een '
                    + 'trui. Je zet je idee om naar kleding: waar komt het te staan, hoe '
                    + 'groot, in welke kleuren, en hoe zorg je dat het op stof nog steeds '
                    + 'klopt.'
            },
            {
                label: 'Creativiteit',
                uitleg: 'Ideeën krijgen is te leren. Je werkt met schetsen, moodboards en '
                    + 'varianten: eerst veel bedenken, dan pas kiezen. Niets is in één '
                    + 'keer goed, en dat hoort er juist bij.'
            },
            {
                label: 'Presenteren',
                uitleg: 'Aan het eind laat je zien wat je gemaakt hebt en waarom. Welke '
                    + 'keuzes heb je gemaakt, en voor wie is het bedoeld? Je oefent met '
                    + 'je werk presenteren, en met feedback vragen én geven.'
            }
        ]
    },

    graffiti: {
        pad: 'urban-art',
        kreet: 'Van schets naar street art.',
        kop: 'Laat jouw ideeën spreken!',
        intro: 'Ontdek hoe je met letters, vormen en kleur een krachtig ontwerp maakt. '
            + 'Werk vanuit een eerste schets toe naar jouw eigen graffiti-artwork en leer '
            + 'materialen veilig te gebruiken en verschillende technieken toe te passen. '
            + 'Ervaring is niet nodig: creativiteit en expressie staan centraal.',
        iconen: [
            {
                label: 'Schets & letters',
                uitleg: 'Graffiti begint op papier. Je leert hoe letters zijn opgebouwd, '
                    + 'hoe je ze vervormt tot een stijl die van jou is, en hoe je van een '
                    + 'eerste schets naar een ontwerp werkt dat je echt kunt spuiten.'
            },
            {
                label: 'Kleur & techniek',
                uitleg: 'Met de bus in je hand komt het aan op afstand, druk en beweging. '
                    + 'Je leert vullen, omlijnen, schaduwen en highlights zetten — en hoe '
                    + 'je veilig en netjes met de materialen omgaat.'
            },
            {
                label: 'Creatieve expressie',
                uitleg: 'Je werk zegt iets. Je bedenkt welke naam, vorm of boodschap bij '
                    + 'jou hoort, en hoe je die zichtbaar maakt in je artwork in plaats '
                    + 'van iemand anders na te maken.'
            },
            {
                label: 'Samen creëren',
                uitleg: 'Aan een groot vlak werk je zelden alleen. Je stemt af over '
                    + 'kleur, ruimte en volgorde, en ziet hoe losse stukken samen één '
                    + 'geheel worden waar de hele groep bij hoort.'
            }
        ]
    },

    schilder: {
        pad: 'paint-your-story',
        kreet: 'Kleur. Creëer. Vertel.',
        kop: 'Geef jouw ideeën kleur!',
        intro: 'Ontdek hoe je met verf, kleur en verschillende schildertechnieken jouw '
            + 'eigen verhaal op doek kunt vertellen. Ervaring is niet nodig: '
            + 'creativiteit, zelfexpressie en plezier staan centraal.',
        iconen: [
            {
                label: 'Kleur',
                uitleg: 'Kleur bepaalt de sfeer van een schilderij. Je leert kleuren '
                    + 'mengen, warm en koud tegen elkaar zetten, en met contrast sturen '
                    + 'waar iemand als eerste naar kijkt.'
            },
            {
                label: 'Techniek',
                uitleg: 'Je werkt met verschillende penselen en manieren van verven: dun '
                    + 'en doorzichtig, dik en met structuur, laag over laag. Zo ontdek je '
                    + 'welke techniek bij jouw beeld past.'
            },
            {
                label: 'Creativiteit',
                uitleg: 'Je begint niet met een voorbeeld dat je namaakt, maar met een '
                    + 'idee van jezelf. Schetsen, proberen, overschilderen: de weg '
                    + 'ernaartoe hoort bij het werk.'
            },
            {
                label: 'Zelfexpressie',
                uitleg: 'Het doek is van jou. Je schildert je eigen verhaal — iets wat je '
                    + 'meemaakte, iets wat je bezighoudt of iets wat je droomt — en leert '
                    + 'dat in beeld te vertalen.'
            }
        ]
    },

    kapper: {
        pad: 'cut-it',
        kreet: 'Knip. Style. Bouw aan je vak.',
        kop: 'Ontdek de wereld van de herenkapper!',
        intro: 'Leer de basis van knippen, contouren, styling en hygiëne. Oefen stap voor '
            + 'stap, ontwikkel precisie en ontdek hoe vakmanschap en ondernemerschap '
            + 'samenkomen. Ervaring is niet nodig: aandacht, creativiteit en plezier '
            + 'staan centraal.',
        iconen: [
            {
                label: 'Knippen & contouren',
                uitleg: 'De basis van het vak: hoe je schaar en tondeuse vasthoudt, hoe '
                    + 'je het haar in secties verdeelt, en hoe je de contour bij de '
                    + 'haarlijn, nek en bakkebaarden strak afwerkt. Je oefent stap voor '
                    + 'stap op een oefenhoofd.'
            },
            {
                label: 'Haar & hoofdvorm',
                uitleg: 'Niet elk model past bij elk hoofd. Je leert kijken naar '
                    + 'haarsoort, groeirichting en de vorm van het hoofd, en je '
                    + 'knipkeuze daarop aanpassen in plaats van overal hetzelfde te doen.'
            },
            {
                label: 'Hygiëne',
                uitleg: 'In een salon is hygiëne onderdeel van het vakmanschap. Je leert '
                    + 'hoe je materiaal reinigt en desinfecteert, hoe een werkplek eruit '
                    + 'hoort te zien, en waarom een klant dat meteen opmerkt.'
            },
            {
                label: 'Ondernemerschap',
                uitleg: 'Een kapper is vaak ook ondernemer. Je krijgt een beeld van wat '
                    + 'daarbij komt kijken: klanten vinden en houden, een prijs bepalen, '
                    + 'je agenda vullen en jezelf laten zien.'
            }
        ]
    },

    hairstyling: {
        pad: 'style-it',
        kreet: 'Verzorg. Style. Creëer.',
        kop: 'Ontdek de wereld van hairstyling!',
        intro: 'Leer verschillende haarsoorten verzorgen, vlechten en stylen. Oefen stap '
            + 'voor stap, ontwikkel jouw eigen stijl en ontdek hoe creativiteit en '
            + 'klantgericht werken samenkomen. Ervaring is niet nodig: aandacht, '
            + 'creativiteit en plezier staan centraal.',
        iconen: [
            {
                label: 'Haarverzorging',
                uitleg: 'Gezond haar is de basis van elk kapsel. Je leert haarsoorten '
                    + 'herkennen — van steil tot krullend en kroes — en welke verzorging, '
                    + 'producten en gereedschappen daarbij horen.'
            },
            {
                label: 'Vlechten & stylen',
                uitleg: 'Van een eenvoudige vlecht tot braids en opgestoken werk. Je '
                    + 'oefent stap voor stap op een oefenhoofd, met aandacht voor '
                    + 'spanning, strakheid en afwerking.'
            },
            {
                label: 'Creativiteit',
                uitleg: 'Een kapsel is een ontwerp. Je leert variëren met vorm, hoogte en '
                    + 'lijn, en een look bedenken die past bij een gelegenheid of bij de '
                    + 'stijl van degene voor wie je het doet.'
            },
            {
                label: 'Klantgerichtheid',
                uitleg: 'Het begint met luisteren. Je oefent het gesprek vooraf: wat wil '
                    + 'iemand, wat kan er met dit haar, en hoe vertel je eerlijk wat wel '
                    + 'en niet lukt.'
            }
        ]
    }
};

module.exports = { FEITEN, FEITEN_NOOT, LESVORMEN, DETAILS };
