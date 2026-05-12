// services/emailService.js — sends transactional emails via nodemailer
// Configure via environment variables (see .env.example).
'use strict';

const nodemailer = require('nodemailer');

const ENV = process.env;

/**
 * Creates a transporter.
 * In development, if no SMTP_HOST is configured, falls back to
 * Ethereal (fake SMTP) and logs the preview URL to the console.
 */
async function createTransporter() {
    if (ENV.SMTP_HOST) {
        return nodemailer.createTransport({
            host:   ENV.SMTP_HOST,
            port:   Number(ENV.SMTP_PORT  || 587),
            secure: ENV.SMTP_SECURE === 'true',     // true = port 465
            auth: {
                user: ENV.SMTP_USER,
                pass: ENV.SMTP_PASS
            }
        });
    }

    // Dev fallback: auto-create an Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    console.log('[emailService] Usando conta Ethereal (dev). Credenciais:', {
        user: testAccount.user,
        pass: testAccount.pass,
        web:  'https://ethereal.email'
    });

    return nodemailer.createTransport({
        host:   'smtp.ethereal.email',
        port:   587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
}

/**
 * Send a password-reset email.
 * @param {string} toEmail    - recipient address
 * @param {string} resetLink  - full URL with token
 */
async function sendPasswordResetEmail(toEmail, resetLink) {
    const from    = ENV.SMTP_FROM    || '"TPoll Tech" <noreply@tpolltech.com.br>';
    const appName = ENV.APP_NAME     || 'TPoll Tech';

    const transporter = await createTransporter();

    const info = await transporter.sendMail({
        from,
        to:      toEmail,
        subject: `Redefinição de senha — ${appName}`,
        text: [
            `Você solicitou a redefinição de senha em ${appName}.`,
            '',
            'Clique no link abaixo (válido por 1 hora):',
            resetLink,
            '',
            'Se não foi você, ignore este e-mail.',
        ].join('\n'),
        html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f4f6f8;margin:0;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px 36px;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <h2 style="color:#1a1a2e;margin-top:0;font-size:20px;">Redefinição de senha</h2>
    <p style="color:#444;line-height:1.6;">
      Você solicitou a redefinição de senha em <strong>${appName}</strong>.<br>
      Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
    </p>
    <a href="${resetLink}"
       style="display:inline-block;margin:24px 0;padding:14px 32px;background:#00BDAE;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
      Redefinir senha
    </a>
    <p style="color:#888;font-size:13px;">
      Ou copie e cole o link no navegador:<br>
      <a href="${resetLink}" style="color:#00BDAE;word-break:break-all;">${resetLink}</a>
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">
    <p style="color:#bbb;font-size:12px;">
      Se não foi você que solicitou, ignore este e-mail. Sua senha permanece a mesma.
    </p>
  </div>
</body>
</html>`
    });

    // In dev Ethereal, log the preview URL
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
        console.log('[emailService] Preview URL:', preview);
    }
}

module.exports = { sendPasswordResetEmail };
