import nodemailer, { type Transporter } from 'nodemailer';

let transport: Transporter | undefined;

function getTransport(): Transporter {
    if (transport) return transport;

    const host = process.env.SMTP_HOST;
    if (!host) throw new Error('smtp_not_configured');

    const port = Number(process.env.SMTP_PORT ?? 587);
    transport = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
            : undefined,
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

    if (!process.env.SMTP_HOST) {
        if (process.env.NODE_ENV === 'production') throw new Error('smtp_not_configured');
        console.info('[mail:dev]', JSON.stringify({ to: message.to, subject: message.subject, text: message.text }));
        return { accepted: true, development: true };
    }

    const info = await getTransport().sendMail({ from, ...message });
    const accepted = Array.isArray(info.accepted) && info.accepted.length > 0;
    return { accepted, development: false };
}
