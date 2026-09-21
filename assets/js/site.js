// Menu behaviour. Everything else on the site is plain HTML and CSS.

(function () {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            const open = nav.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', String(open));
        });
    }

    // On touch screens the submenus open on tap instead of hover
    document.querySelectorAll('.nav-folder > button').forEach(button => {
        button.addEventListener('click', () => {
            const folder = button.parentElement;
            const open = folder.getAttribute('aria-expanded') === 'true';
            folder.setAttribute('aria-expanded', String(!open));
            button.setAttribute('aria-expanded', String(!open));
        });
    });

    // Videos moved into the flow of a text block, so they sit between paragraphs instead
    // of floating over them. A deliberate difference from the original, listed here by
    // hand: tools/convert.js rebuilds the pages but never this file.
    const inlineVideos = [
        { page: '/voetbal', textBlock: 'fe-block-807364c966cf9516981f', before: 'tx-11' }
    ];

    inlineVideos.forEach(move => {
        if (!location.pathname.startsWith(move.page)) return;
        const text = document.querySelector(`.${move.textBlock}`);
        const target = text && text.querySelector(`.${move.before}`);
        const section = text && text.closest('.page-section');
        if (!text || !target || !section) return;

        const video = [...section.querySelectorAll('.fe-block')].find(block => block.querySelector('.block-video'));
        if (!video) return;

        video.classList.add('is-inline');
        text.classList.add('has-inline-video'); // hides the blank lines that made room for it
        target.parentElement.insertBefore(video, target);
    });

    // Marquees: repeat the text until it fills the strip twice, so the loop is seamless,
    // then set how long one lap takes from the strip's speed in pixels per second.
    function copyOf(element) {
        const copy = element.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        return copy;
    }

    document.querySelectorAll('.marquee').forEach(marquee => {
        const track = marquee.querySelector('.marquee-track');
        if (!track || !track.children.length) return;

        const original = [...track.children];
        const setWidth = track.getBoundingClientRect().width;
        const copies = Math.max(1, Math.ceil(marquee.clientWidth / Math.max(setWidth, 1)));
        for (let i = 1; i < copies; i++) original.forEach(item => track.appendChild(copyOf(item)));
        [...track.children].forEach(item => track.appendChild(copyOf(item)));

        const speed = parseFloat(marquee.dataset.speed) || 50;
        const setDuration = () => {
            const lap = track.getBoundingClientRect().width / 2;
            track.style.setProperty('--marquee-duration', `${(lap / speed).toFixed(2)}s`);
        };
        setDuration();
        window.addEventListener('resize', setDuration);
    });
})();
