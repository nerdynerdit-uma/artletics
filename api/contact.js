// Sends a contact-form message to info@stichtingfacts.nl through Resend.
//
// Needs two environment variables in Vercel:
//   RESEND_API_KEY   the key from resend.com
//   CONTACT_FROM     a sender on a domain verified in Resend, e.g. site@artletics.nl
//
// Without them the endpoint says so and sends nothing. It never reports success it
// did not get from Resend.
//
// This is the only code on the site that runs on a server, so it is the only place
// an attacker has anything to aim at. There is no database and no SQL anywhere, so
// the risk here is not injection but **abuse**: the endpoint hands a stranger a way
// to put text in someone's mailbox. Everything below exists to make that expensive.
// None of it is a wall; together it is enough to stop scripted abuse, which is what
// actually turns up.

const TO = 'info@stichtingfacts.nl';

// Hosts the form may be submitted from. A browser always sends Origin on a POST made
// with fetch, so a request without one, or with somebody else's, is not our form.
// Forgeable with curl, so this is a filter and not a lock -- the rate limit below is
// what stands behind it.
const EIGEN_HOSTS = new Set(['artletics.nl', 'www.artletics.nl', '127.0.0.1', 'localhost']);
const isEigenOrigin = (origin) => {
    if (!origin) return false;
    try {
        const { hostname } = new URL(origin);
        // Vercel gives every preview deployment its own name under vercel.app.
        return EIGEN_HOSTS.has(hostname) || hostname.endsWith('.vercel.app');
    } catch (fout) {
        return false;
    }
};

// At most this many messages from one address inside the window. The map lives in the
// instance's memory and disappears with it, and Vercel may run several instances, so
// this slows a flood rather than stopping it dead. Nothing is written to disk and no
// address is kept beyond the window.
const MAX_PER_VENSTER = 5;
const VENSTER_MS = 10 * 60 * 1000;
const bezoeken = new Map();

function teVaak(adres) {
    const nu = Date.now();
    for (const [sleutel, tijden] of bezoeken) {
        const vers = tijden.filter(t => nu - t < VENSTER_MS);
        if (vers.length) bezoeken.set(sleutel, vers);
        else bezoeken.delete(sleutel);
    }
    const eigen = bezoeken.get(adres) || [];
    if (eigen.length >= MAX_PER_VENSTER) return true;
    bezoeken.set(adres, [...eigen, nu]);
    return false;
}

// Trim, cap the length, and drop control characters: a newline in a name or a subject
// has no business being there and is the shape header injection takes.
function clean(value, max, eenRegel = false) {
    let text = String(value == null ? '' : value).trim().slice(0, max);
    // eslint-disable-next-line no-control-regex
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    if (eenRegel) text = text.replace(/[\r\n]+/g, ' ');
    return text;
}

function escape(text) {
    return text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

module.exports = async (request, response) => {
    // An answer to a form post is never worth keeping anywhere.
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Alleen POST.' });
    }

    if (!isEigenOrigin(request.headers.origin)) {
        return response.status(403).json({ error: 'Dit formulier hoort bij artletics.nl.' });
    }

    const type = String(request.headers['content-type'] || '');
    if (!type.includes('application/json')) {
        return response.status(415).json({ error: 'Stuur JSON.' });
    }

    // Vercel parses the body itself when it can; a string that is not JSON used to
    // throw here and come out as a 500.
    let body;
    try {
        const raw = request.body;
        if (typeof raw === 'string') {
            if (raw.length > 20000) return response.status(413).json({ error: 'Bericht te lang.' });
            body = JSON.parse(raw || '{}');
        } else {
            body = raw || {};
        }
    } catch (fout) {
        return response.status(400).json({ error: 'Onleesbaar bericht.' });
    }
    if (typeof body !== 'object' || Array.isArray(body)) {
        return response.status(400).json({ error: 'Onleesbaar bericht.' });
    }

    // The honeypot. The form carries a field no one can see and no one can tab into;
    // a visitor leaves it empty and a form-filling robot does not. Answering "ok"
    // rather than an error keeps the robot from learning what gave it away.
    if (clean(body.website, 200)) {
        return response.status(200).json({ ok: true });
    }

    // The form stamps the moment it was drawn. Nobody reads a page, picks a role and
    // types their details inside three seconds. Missing stamp: let it through, so a
    // page still in someone's cache from before this change keeps working.
    const geopend = Number(body.t);
    if (Number.isFinite(geopend) && geopend > 0 && Date.now() - geopend < 3000) {
        return response.status(200).json({ ok: true });
    }

    const adres = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || 'onbekend';
    if (teVaak(adres)) {
        response.setHeader('Retry-After', '600');
        return response.status(429).json({
            error: 'Er zijn net meerdere berichten verstuurd. Probeer het over tien '
                + 'minuten nog eens, of mail ons op info@stichtingfacts.nl.'
        });
    }

    const firstName = clean(body.firstName, 100, true);
    const lastName = clean(body.lastName, 100, true);
    const email = clean(body.email, 200, true);
    const subject = clean(body.subject, 200, true);
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
        message,
        '',
        '--',
        'Verstuurd via het formulier op artletics.nl. Het adres hierboven is door de '
            + 'afzender zelf ingevuld en is niet gecontroleerd.'
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
