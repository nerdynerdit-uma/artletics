// The sign-up form. It posts to /api/contact, the same endpoint the contact form uses,
// so there is one mailbox and one mail service to keep working. The answer under the
// button is whatever the server actually said: nothing here claims a message was sent.

(function () {
    const form = document.getElementById('aanmeldForm');
    if (!form) return;

    const note = document.getElementById('aanmeldNote');
    const button = form.querySelector('.form-submit');
    const label = button.textContent;

    function say(text, failed) {
        note.textContent = text;
        note.classList.toggle('is-error', !!failed);
        note.hidden = false;
    }

    // The label beside the radio, so the mail reads "School" and not "school".
    function rolTekst() {
        const gekozen = form.querySelector('input[name="rol"]:checked');
        if (!gekozen) return '';
        const titel = gekozen.closest('.rol-kaart').querySelector('.rol-titel');
        return titel ? titel.textContent.trim() : gekozen.value;
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const d = Object.fromEntries(new FormData(form));
        const rol = rolTekst();
        const regels = [
            `Rol: ${rol}`,
            `Programma: ${d.programma || 'nog niet gekozen'}`,
            `Naam: ${d.firstName} ${d.lastName}`,
            d.organisatie ? `Organisatie: ${d.organisatie}` : null,
            `E-mail: ${d.email}`,
            d.telefoon ? `Telefoon: ${d.telefoon}` : null,
            d.plaats ? `Plaats of wijk: ${d.plaats}` : null,
            d.groep ? `Groep: ${d.groep}` : null,
            '',
            d.toelichting || '(geen toelichting)'
        ].filter(r => r !== null);

        button.disabled = true;
        button.textContent = 'Versturen...';
        note.hidden = true;

        try {
            const reply = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: d.firstName,
                    lastName: d.lastName,
                    email: d.email,
                    subject: `Aanmelding ${d.programma || 'Artletics'} (${rol})`,
                    message: regels.join('\n')
                })
            });
            const result = await reply.json().catch(() => ({}));
            if (!reply.ok) throw new Error(result.error || 'Versturen is niet gelukt.');
            form.reset();
            say('Bedankt! Je aanmelding is verstuurd. We nemen binnen twee werkdagen '
                + 'contact op.', false);
        } catch (error) {
            say(error.message + ' Mail ons op info@stichtingfacts.nl.', true);
        } finally {
            button.disabled = false;
            button.textContent = label;
        }
    });
})();
