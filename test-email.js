import 'dotenv/config';
import { sendEmail } from './server/src/services/email.service.js';

await sendEmail({
  to: 'marcelofeuser.go@gmail.com',
  subject: 'Teste InsightDISC',
  html: '<h1>Email funcionando</h1>',
});

console.log('EMAIL OK');