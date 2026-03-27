import 'dotenv/config';
import { sendEmail } from './server/src/services/email.service.js';

console.log('--- VALIDANDO CREDENCIAIS ---');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS_LEN:', (process.env.EMAIL_PASS || '').length);
console.log('-----------------------------');

await sendEmail({
  to: 'marcelofeuser.go@gmail.com',
  subject: 'Teste InsightDISC',
  html: '<h1>Email funcionando</h1><p>Enviado via Zoho SMTP com Nodemailer.</p>',
});

console.log('EMAIL OK - Verifique sua caixa de entrada.');