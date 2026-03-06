import { jsPDF } from 'jspdf';
import { getAssessmentSnapshot } from './_lib/dev-store.js';

function readQuery(req, key) {
  const value = req?.query?.[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function getSections(mode) {
  if (mode === 'premium') {
    return [
      '0 Capa',
      '1 Sumário',
      '2 Visão geral do DISC',
      '3 Perfil Natural',
      '4 Perfil Adaptado',
      '5 Perfil Atual',
      '6 Perfil dominante',
      '7 Motivadores',
      '8 Desenvolvimento',
      '9 Hábitos e habilidades',
      '10 Radar 16 + destaques',
      '11 Comunicação (parte 1)',
      '12 Comunicação (parte 2)',
      '13 Trabalho',
      '14 Liderança (parte 1)',
      '15 Liderança (parte 2)',
      '16 Medos/Gatilhos',
      '17 Quadrante (parte 1)',
      '18 Quadrante (parte 2)',
      '19 Questionário',
      '20 Anotações',
      '21 Considerações finais',
      '22 Plano de ação',
      '23 Feedback 360',
      '24 Desenvolvimento contínuo',
      '25 Recomendações',
      '26 Encerramento',
    ];
  }

  return [
    '0 Capa',
    '1 Visão geral',
    '2 Perfil Natural + resumo',
  ];
}

function drawHeader(doc, title, subtitle) {
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(subtitle, 14, 22);
  doc.setTextColor(15, 23, 42);
}

function drawFooter(doc, pageNumber, totalPages) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`InsightDISC • Página ${pageNumber}/${totalPages}`, 14, 289);
}

function drawSummaryBars(doc, scores = {}) {
  const factors = ['D', 'I', 'S', 'C'];
  const colors = {
    D: [239, 68, 68],
    I: [249, 115, 22],
    S: [34, 197, 94],
    C: [59, 130, 246],
  };

  factors.forEach((factor, idx) => {
    const y = 82 + idx * 20;
    const value = Math.max(0, Math.min(100, Number(scores?.[factor] || 0)));
    doc.setFont('helvetica', 'bold');
    doc.text(factor, 16, y + 5);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(241, 245, 249);
    doc.rect(24, y, 120, 8, 'FD');
    doc.setFillColor(...colors[factor]);
    doc.rect(24, y, (120 * value) / 100, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.text(`${Math.round(value)}%`, 150, y + 5);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const assessmentId = readQuery(req, 'assessmentId') || 'sem-id';
    const mode = readQuery(req, 'mode') === 'premium' ? 'premium' : 'free';
    const assessment = (await getAssessmentSnapshot(assessmentId)) || {};
    const natural = assessment?.results?.natural_profile || assessment?.natural_profile || {};
    const sections = getSections(mode);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    sections.forEach((section, index) => {
      if (index > 0) doc.addPage();

      drawHeader(
        doc,
        mode === 'premium' ? 'Relatório InsightDISC Premium' : 'Relatório InsightDISC Free',
        `Assessment ${assessmentId}`
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(section, 14, 44);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(
        'Documento gerado automaticamente pelo InsightDISC. Conteúdo demonstrativo para funil, checkout e entrega de valor.',
        14,
        54,
        { maxWidth: 180 }
      );

      if (index <= 2) {
        drawSummaryBars(doc, natural);
      }

      drawFooter(doc, index + 1, sections.length);
    });

    const output = doc.output('arraybuffer');
    const fileName = `insightdisc-${mode}-${assessmentId}.pdf`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.end(Buffer.from(output));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: false,
        error: error?.message || 'Falha ao gerar PDF.',
      })
    );
  }
}
