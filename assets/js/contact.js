// Contact form. Posts to /api/contact, which mails the message to info@stichtingfacts.nl.
// Nothing here pretends a message was sent: the note under the button repeats what the
// server actually answered, and says so plainly when sending failed.

(function () {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const note = document.getElementById('contactNote');
    const button = form.querySelector('.form-submit');
    const label = button.textContent;

    function say(text, failed) {
        note.textContent = text;
        note.classList.toggle('is-error', !!failed);
        note.hidden = false;
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        button.disabled = true;
        button.textContent = 'Versturen...';
        note.hidden = true;

        try {
            const reply = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });
            const result = await reply.json().catch(() => ({}));
            if (!reply.ok) throw new Error(result.error || 'Versturen is niet gelukt.');
            form.reset();
            say('Bedankt! Je bericht is verstuurd.', false);
        } catch (error) {
            say(error.message + ' Mail ons op info@stichtingfacts.nl.', true);
        } finally {
            button.disabled = false;
            button.textContent = label;
        }
    });
})();
