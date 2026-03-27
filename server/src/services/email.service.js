import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail({ to, subject, html, replyTo }) {
  return transporter.sendMail({
    from: `"InsightDISC" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    replyTo: replyTo || process.env.EMAIL_USER,
  });
}
