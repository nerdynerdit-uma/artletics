// Sends a contact-form message to info@stichtingfacts.nl through Resend.
//
// Needs two environment variables in Vercel:
//   RESEND_API_KEY   the key from resend.com
//   CONTACT_FROM     a sender on a domain verified in Resend, e.g. site@artletics.nl
//
// Without them the endpoint says so and sends nothing. It never reports success it
// did not get from Resend.

const TO = 'info@stichtingfacts.nl';

function clean(value, max) {
    return String(value == null ? '' : value).trim().slice(0, max);
}

function escape(text) {
    return text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

module.exports = async (request, response) => {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Alleen POST.' });
    }

    const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
    const firstName = clean(body.firstName, 100);
    const lastName = clean(body.lastName, 100);
    const email = clean(body.email, 200);
    const subject = clean(body.subject, 200);
    const message = clean(body.message, 5000);

    if (!firstName || !lastName || !subject || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return response.status(400).json({ error: 'Vul alle velden in met een geldig e-mailadres.' });
    }

    const key = process.env.RESEND_API_KEY;
    const from = process.env.CONTACT_FROM;
    if (!key || !from) {
        return response.status(503).json({ error: 'Het formulier is nog niet gekoppeld aan een mailservice.' });
    }

    const lines = [
        `Naam: ${firstName} ${lastName}`,
        `E-mail: ${email}`,
        `Onderwerp: ${subject}`,
        '',
        message
    ].join('\n');

    const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from,
            to: [TO],
            reply_to: email,
            subject: `Contactformulier: ${subject}`,
            text: lines,
            html: `<pre style="font: 14px/1.5 Helvetica, Arial, sans-serif">${escape(lines)}</pre>`
        })
    });

    if (!sent.ok) {
        const detail = await sent.text();
        console.error('Resend refused the message:', sent.status, detail);
        return response.status(502).json({ error: 'De mailservice kon het bericht niet versturen.' });
    }

    return response.status(200).json({ ok: true });
};
