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
    },
    // --- 2. Muziek, media en performance ---------------------------------------------
    dj: {
        pad: 'mix-it-up',
        kreet: 'Mix. Create. Perform.',
        kop: 'Ontdek de wereld van DJ’en!',
        intro: 'Leer beats en tracks mixen, werk met echte DJ-apparatuur en ontdek hoe '
            + 'je jouw eigen sound creëert. Ervaring is niet nodig: creativiteit, muziek '
            + 'en plezier staan voorop.',
        iconen: [
            {
                label: 'Mixen & beats',
                uitleg: 'Twee nummers in elkaar laten overlopen zonder dat de dansvloer '
                    + 'het merkt. Je leert tellen op de maat, het tempo gelijkzetten en '
                    + 'met de crossfader en de toonregeling de overgang maken.'
            },
            {
                label: 'DJ-skills',
                uitleg: 'Je werkt op echte apparatuur: spelers, mengpaneel en koptelefoon. '
                    + 'Je leert cuepunten zetten, voorluisteren terwijl de zaal iets '
                    + 'anders hoort, en je set opbouwen van rustig naar vol.'
            },
            {
                label: 'Creativiteit',
                uitleg: 'Een set is een reeks eigen keuzes. Welke nummers passen bij '
                    + 'elkaar, welke volgorde vertelt een verhaal, en waar zet je de '
                    + 'verrassing? Je ontdekt wat jouw smaak is in plaats van een lijstje '
                    + 'af te draaien.'
            },
            {
                label: 'Samen leren',
                uitleg: 'Je draait voor en met elkaar. Je kijkt mee bij een ander, zegt '
                    + 'wat je hoorde werken, en gaat zelf achter de set staan terwijl de '
                    + 'groep meeluistert.'
            }
        ]
    },

    muziek: {
        pad: 'create-your-sound',
        kreet: 'Maak. Experimenteer. Laat je horen.',
        kop: 'Ontdek hoe muziek wordt gemaakt!',
        intro: 'Maak beats, schrijf teksten en experimenteer met stem, geluid en AI. '
            + 'Ontdek hoe technologie je kan helpen om muzikale ideeën uit te werken en '
            + 'ontwikkel stap voor stap jouw eigen sound. Ervaring is niet nodig: '
            + 'creativiteit en plezier staan centraal.',
        iconen: [
            {
                label: 'Beatmaking',
                uitleg: 'Een beat bestaat uit lagen: kick, snare, hi-hat en bas. Je leert '
                    + 'ritme neerzetten op een drumpad of in de computer, en er met een '
                    + 'sample of een melodie iets van maken dat van jou is.'
            },
            {
                label: 'Songwriting',
                uitleg: 'Je schrijft tekst op je eigen beat: waar gaat het over, wat is '
                    + 'het refrein, en hoe laat je de woorden op de maat vallen. Rijm is '
                    + 'handig, maar eerlijk zijn werkt beter.'
            },
            {
                label: 'Muziekproductie',
                uitleg: 'In het programma komt alles samen: opnemen, lagen stapelen, '
                    + 'knippen en mixen tot één nummer. Je leert hoe hard elk spoor moet '
                    + 'staan, en hoe je hoort dat iets af is.'
            },
            {
                label: 'AI & muziek',
                uitleg: 'AI kan helpen bij een eerste idee, een tegenmelodie of het '
                    + 'opschonen van geluid. Je leert het gebruiken als gereedschap en '
                    + 'niet als vervanger, zodat het nummer van jou blijft.'
            }
        ]
    },

    'social-media': {
        pad: 'make-it-social',
        kreet: 'Bedenk. Maak. Deel.',
        kop: 'Maak content die gezien mag worden!',
        intro: 'Ontdek hoe je van een idee een sterke foto, video of socialmediapost '
            + 'maakt. Leer filmen, fotograferen, monteren en een verhaal vertellen. Ook '
            + 'ontdek je hoe je AI slim en verantwoord gebruikt en bewust omgaat met wat '
            + 'je online deelt. Ervaring is niet nodig: creativiteit en plezier staan '
            + 'centraal.',
        iconen: [
            {
                label: 'Foto & video',
                uitleg: 'Licht, kader en standpunt bepalen hoe een beeld overkomt. Je '
                    + 'oefent met een camera en met je telefoon: filmen, fotograferen, en '
                    + 'opnieuw proberen tot het shot klopt.'
            },
            {
                label: 'Storytelling',
                uitleg: 'Een post wordt pas sterk als er iets te vertellen valt. Je werkt '
                    + 'een idee uit tot een begin, een midden en een eind — ook als je er '
                    + 'maar vijftien seconden voor hebt.'
            },
            {
                label: 'Editing & AI',
                uitleg: 'Monteren is vooral kiezen wat weg mag. Je knipt, zet er muziek '
                    + 'en tekst onder, en ontdekt waar AI je werk sneller maakt en waar '
                    + 'het je werk juist vlak maakt.'
            },
            {
                label: 'Online bewustzijn',
                uitleg: 'Wat je plaatst blijft. Je denkt na over wat je deelt, over wie '
                    + 'er op je beeld staat en of dat mag, en over het verschil tussen '
                    + 'hoe iets er online uitziet en hoe het echt was.'
            }
        ]
    },

    dance: {
        pad: 'move-it',
        kreet: 'Voel de beat. Vind je stijl. Pak het podium.',
        kop: 'Ontdek jouw eigen manier van bewegen!',
        intro: 'Tijdens Move It werk je met muziek, ritme en choreografie aan expressie, '
            + 'zelfvertrouwen en samenwerken. Ervaring is niet nodig: plezier en jezelf '
            + 'durven laten zien staan centraal.',
        iconen: [
            {
                label: 'Ritme & muziek',
                uitleg: 'Dansen begint bij horen. Je leert de tellen in de muziek voelen, '
                    + 'op de beat blijven en het verschil maken tussen snel en traag '
                    + 'bewegen op dezelfde maat.'
            },
            {
                label: 'Choreografie',
                uitleg: 'Je leert een reeks passen, onthoudt de volgorde en maakt er '
                    + 'daarna zelf een stuk bij. Herhalen hoort erbij: dat is hoe het er '
                    + 'uiteindelijk los uit gaat zien.'
            },
            {
                label: 'Expressie',
                uitleg: 'Dezelfde pas ziet er anders uit als je hem meent. Je oefent met '
                    + 'houding, blik en energie — en met durven: groot bewegen terwijl er '
                    + 'iemand kijkt.'
            },
            {
                label: 'Samen dansen',
                uitleg: 'In een groep let je op elkaar: dezelfde tel, dezelfde richting, '
                    + 'genoeg ruimte. Je leert voorgaan, volgen en opvangen wanneer '
                    + 'iemand de draad kwijt is.'
            }
        ]
    },

    // --- 3. Sport, gezondheid en weerbaarheid ----------------------------------------
    voetbal: {
        pad: 'kick-it',
        kreet: 'Speel. Groei. Werk samen.',
        kop: 'Laat zien wat jij in huis hebt!',
        intro: 'Tijdens Kick It werk je op een actieve en plezierige manier aan '
            + 'balcontrole, passing, techniek en samenspel. Met oefeningen, challenges en '
            + 'partijvormen ontwikkel je jouw vaardigheden en leer je samenwerken, '
            + 'doorzetten en positief coachen. Ervaring is niet nodig: inzet, plezier en '
            + 'groei staan centraal.',
        iconen: [
            {
                label: 'Balcontrole',
                uitleg: 'De bal aannemen, meenemen en bij je houden terwijl er druk op '
                    + 'staat. Je oefent met beide voeten, met de binnenkant en de zool, '
                    + 'tot je niet meer hoeft te kijken waar de bal is.'
            },
            {
                label: 'Passing & techniek',
                uitleg: 'Strak inspelen, aannemen en opdraaien. Je oefent de pass over '
                    + 'korte en langere afstand, en merkt waarom hard en op de goede voet '
                    + 'belangrijker is dan mooi.'
            },
            {
                label: 'Samenspel',
                uitleg: 'Voetbal win je samen. Je leert vrijlopen, overspelen, dekken en '
                    + 'elkaar coachen — en dat de beste actie vaak de pass is die niemand '
                    + 'opvalt.'
            },
            {
                label: 'Spelplezier',
                uitleg: 'Partijvormen, challenges en korte toernooitjes. Winnen mag, maar '
                    + 'het gaat om meedoen, opnieuw proberen en de sfeer in de groep.'
            }
        ]
    },

    kickboks: {
        pad: 'own-your-power',
        kreet: 'Focus. Controle. Zelfvertrouwen.',
        kop: 'Ontdek de kracht in jezelf!',
        intro: 'Tijdens Own Your Power maak je op een veilige en energieke manier kennis '
            + 'met kickboksen. Je oefent houding, stoten, trappen en combinaties op pads '
            + 'en werkt aan conditie, focus, zelfbeheersing en zelfvertrouwen. Ervaring '
            + 'is niet nodig: respect, techniek en persoonlijke groei staan centraal.',
        iconen: [
            {
                label: 'Techniek & conditie',
                uitleg: 'Houding, stoten, trappen en combinaties, geoefend op pads. '
                    + 'Daarnaast werk je aan conditie, zodat je aan het eind van de les '
                    + 'nog net zo netjes beweegt als aan het begin.'
            },
            {
                label: 'Focus',
                uitleg: 'Kickboksen vraagt aandacht: kijken, reageren, op het juiste '
                    + 'moment. Je leert je hoofd erbij houden en niet meegaan in haast of '
                    + 'in boosheid.'
            },
            {
                label: 'Zelfbeheersing',
                uitleg: 'Kracht hebben is iets anders dan kracht gebruiken. Je traint met '
                    + 'controle, houdt rekening met je partner en stopt wanneer dat moet. '
                    + 'Respect voor elkaar is de regel, niet de uitzondering.'
            },
            {
                label: 'Zelfvertrouwen',
                uitleg: 'Door te merken wat je kunt, ga je anders staan. Je leert je '
                    + 'eigen grens kennen en stap voor stap verleggen — in de zaal en '
                    + 'daarbuiten.'
            }
        ]
    },

    fitness: {
        pad: 'power-up',
        kreet: 'Train op jouw niveau. Werk samen. Word stap voor stap sterker.',
        kop: 'Meer dan alleen bewegen!',
        intro: 'Tijdens Power Up werk je met fitnessoefeningen, sportieve challenges en '
            + 'teamopdrachten aan conditie, coördinatie, zelfvertrouwen en samenwerking. '
            + 'Je traint op je eigen niveau en ontdekt hoe beweging, voeding, rust en '
            + 'mindset bijdragen aan een gezonde leefstijl.',
        iconen: [
            {
                label: 'Fitness',
                uitleg: 'Je werkt aan kracht, conditie en coördinatie met oefeningen op '
                    + 'jouw niveau: met je eigen lichaamsgewicht, met weerstandsbanden en '
                    + 'in korte rondes. Niet wie het zwaarst tilt telt, maar of de '
                    + 'beweging klopt.'
            },
            {
                label: 'Voeding',
                uitleg: 'Wat je eet en drinkt bepaalt hoe je traint. In gewone taal leer '
                    + 'je wat je lichaam nodig heeft, hoe een verstandige keuze eruitziet '
                    + 'en waarom ontbijten en water geen bijzaak zijn.'
            },
            {
                label: 'Mindset',
                uitleg: 'Doorzetten als het tegenzit, en merken wanneer je juist rust '
                    + 'nodig hebt. Je ontdekt hoe slaap, spanning en je hoofd meedoen met '
                    + 'wat je lichaam kan.'
            },
            {
                label: 'Teamchallenges',
                uitleg: 'Opdrachten die je alleen samen afkrijgt. Je leert overleggen, '
                    + 'taken verdelen en elkaar aanmoedigen, ook met mensen die je '
                    + 'daarvoor niet kende.'
            }
        ]
    },

    zelfverdediging: {
        pad: 'safe-and-strong',
        kreet: 'Herken je grens. Gebruik je stem. Sta sterk.',
        kop: 'Sterk staan begint bij jezelf!',
        intro: 'Leer stevig staan, je grenzen herkennen en duidelijk ‘nee’ zeggen. Met '
            + 'praktische oefeningen en herkenbare situaties werk je aan zelfvertrouwen, '
            + 'weerbaarheid en veilig handelen.',
        iconen: [
            {
                label: 'Grenzen',
                uitleg: 'Weten waar jouw grens ligt, en die ook kunnen aangeven. Je '
                    + 'oefent met herkenbare situaties: wanneer voelt iets niet goed, en '
                    + 'wat doe je op dat moment.'
            },
            {
                label: 'Stemgebruik',
                uitleg: 'Je stem is je eerste verdediging. Je leert duidelijk en hard '
                    + 'genoeg ‘nee’ en ‘stop’ zeggen, met een houding die erbij past, '
                    + 'zodat het ook zo overkomt.'
            },
            {
                label: 'Rust & controle',
                uitleg: 'Bij spanning gaat je ademhaling omhoog en je denken omlaag. Je '
                    + 'oefent rustig blijven, ruimte maken en eerst nadenken voordat je '
                    + 'reageert.'
            },
            {
                label: 'Veilig handelen',
                uitleg: 'Eerst weglopen, hulp zoeken of een volwassene erbij halen; pas '
                    + 'als het echt moet, jezelf losmaken. Je leert eenvoudige technieken '
                    + 'die ook werken als de ander sterker is.'
            }
        ]
    },

    // --- 4. Gesprek, identiteit en sociale kracht ------------------------------------
    'praat-her': {
        pad: 'lets-talk-her-space',
        kreet: 'Praat. Deel. Groei. Jouw stem telt.',
        kop: 'Een open workshop voor meiden',
        intro: 'In een veilige en open groep praat je over wat jou bezighoudt: '
            + 'identiteit, zelfvertrouwen, emoties, vriendschap, relaties, grenzen en '
            + 'sociale druk. Je leert jezelf én elkaar beter begrijpen.',
        iconen: [
            {
                label: 'Identiteit',
                uitleg: 'Wie ben je, los van wat er van je verwacht wordt? Je praat over '
                    + 'thuis, school, achtergrond en sociale media, en over het verschil '
                    + 'tussen wie je bent en hoe je overkomt.'
            },
            {
                label: 'Zelfvertrouwen',
                uitleg: 'Hoe kijk je naar jezelf, en waar komt dat beeld vandaan? Je '
                    + 'deelt wat je onzeker maakt en merkt dat je daar zelden de enige in '
                    + 'bent.'
            },
            {
                label: 'Grenzen',
                uitleg: 'Nee zeggen tegen een vriendin, tegen een groep of tegen iemand '
                    + 'die verder wil dan jij. Je oefent om in woorden te krijgen wat je '
                    + 'wel en niet wilt.'
            },
            {
                label: 'Verbinding',
                uitleg: 'Praten lucht op, luisteren doet net zoveel. In de groep geldt: '
                    + 'wat hier gezegd wordt, blijft hier. Zo ontstaat een plek waar je '
                    + 'elkaar steunt in plaats van beoordeelt.'
            }
        ]
    },

    'praat-his': {
        pad: 'lets-talk-his-space',
        kreet: 'Praat. Deel. Groei. Jouw stem telt.',
        kop: 'Een open workshop voor jongens',
        intro: 'In een veilige en open groep praat je over wat jou bezighoudt: '
            + 'identiteit, zelfvertrouwen, emoties, vriendschap, relaties, grenzen en '
            + 'sociale druk. Je leert jezelf én elkaar beter begrijpen.',
        iconen: [
            {
                label: 'Identiteit',
                uitleg: 'Wie ben je, en wie verwacht iedereen dat je bent? Je praat over '
                    + 'thuis, school, vrienden en het beeld van ‘een echte jongen’ — en '
                    + 'over wat daarvan voor jou klopt.'
            },
            {
                label: 'Zelfvertrouwen',
                uitleg: 'Stoer doen is iets anders dan zeker zijn. Je ontdekt waar jouw '
                    + 'onzekerheid zit en merkt dat anderen in de groep tegen hetzelfde '
                    + 'aanlopen.'
            },
            {
                label: 'Grenzen',
                uitleg: 'Nee zeggen tegen een groep, tegen druk of tegen iets wat je '
                    + 'eigenlijk niet wilt. Je oefent met wat je dan zegt, en met hoe je '
                    + 'het zegt.'
            },
            {
                label: 'Verbinding',
                uitleg: 'Een gesprek zonder grappen eroverheen. In de groep geldt: wat '
                    + 'hier gezegd wordt, blijft hier. Je leert luisteren zonder meteen '
                    + 'een oplossing te geven.'
            }
        ]
    }
};

module.exports = { FEITEN, FEITEN_NOOT, LESVORMEN, DETAILS };
