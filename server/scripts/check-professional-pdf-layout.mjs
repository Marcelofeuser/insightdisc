import fs from 'fs';
import puppeteer from 'puppeteer-core';

const htmlPath = 'report-templates/approved/html/relatorio_disc_professional.html';
const outPath = '/tmp/check_professional_layout.pdf';

const html = fs.readFileSync(htmlPath, 'utf8');

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ['--no-sandbox']
});

const page = await browser.newPage();
await page.setContent(html, {
  waitUntil: 'domcontentloaded',
  timeout: 120000
});

await page.pdf({
  path: outPath,
  width: '297mm',
  height: '167mm',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: false
});

await browser.close();

console.log('PDF gerado em:', outPath);
console.log('VALIDAR MANUALMENTE:');
console.log('- páginas de gráficos sem invadir a seguinte');
console.log('- sem faixas brancas');
console.log('- sem sobreposição entre gráfico e texto');
