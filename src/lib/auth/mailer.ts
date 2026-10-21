import nodemailer, { type Transporter } from 'nodemailer';

let transport: Transporter | undefined;

function smtpHost(): string | undefined {
    return process.env.SMTP_HOST?.trim() || undefined;
}

function smtpPort(): number {
    return Number(process.env.SMTP_PORT ?? 587);
}

function getTransport(): Transporter {
    if (transport) return transport;

    const host = smtpHost();
    if (!host) throw new Error('smtp_not_configured');

    const port = smtpPort();
    transport = nodemailer.createTransport({
        host,
        port,
        // 465 is implicit TLS; 587/25 negotiate STARTTLS opportunistically.
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        // Postfix may reject a short container hostname at EHLO; default to the
        // configured mail hostname, which is always a FQDN.
        name: process.env.SMTP_EHLO_NAME?.trim() || host,
        auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
            : undefined,
        ignoreTLS: process.env.SMTP_IGNORE_TLS === 'true',
        tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false' },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
    });

    return transport;
}

export interface MailResult {
    accepted: boolean;
    development: boolean;
}

export async function sendMail(message: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}): Promise<MailResult> {
    const from = process.env.SMTP_FROM ?? 'ABA Clínico <no-reply@aba.local>';

    if (!smtpHost()) {
        if (process.env.NODE_ENV === 'production') throw new Error('smtp_not_configured');
        console.info('[mail:dev]', JSON.stringify({ to: message.to, subject: message.subject, text: message.text }));
        return { accepted: true, development: true };
    }

    try {
        const info = await getTransport().sendMail({ from, ...message });
        const accepted = Array.isArray(info.accepted) && info.accepted.length > 0;
        return { accepted, development: false };
    } catch (error) {
        const failure = error as { code?: string; command?: string; responseCode?: number; response?: string };
        // Never log credentials; the SMTP response explains rejects and relays.
        console.error('[mail] send failed', {
            host: smtpHost(),
            port: smtpPort(),
            code: failure.code,
            command: failure.command,
            responseCode: failure.responseCode,
            response: failure.response,
        });
        throw error;
    }
}
