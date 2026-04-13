import nodemailer from 'nodemailer';

const EMAIL_USER = String(process.env.EMAIL_USER || '').trim();
const EMAIL_PASS = String(process.env.EMAIL_PASS || '').trim();

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn('[email] EMAIL_USER ou EMAIL_PASS não configurados — envio de e-mail desativado.');
}

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

export async function sendEmail({ to, subject, html, replyTo }) {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('[email] Envio ignorado: credenciais não configuradas.', { to, subject });
    return null;
  }
  return transporter.sendMail({
    from: `"InsightDISC" <${EMAIL_USER}>`,
    to,
    subject,
    html,
    replyTo: replyTo || EMAIL_USER,
  });
}
