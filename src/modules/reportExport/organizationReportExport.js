import { jsPDF } from 'jspdf';

function line(doc, text, x, y, maxWidth = 170) {
  const chunks = doc.splitTextToSize(String(text || ''), maxWidth);
  doc.text(chunks, x, y);
  return y + chunks.length * 6;
}

function downloadBlob(blob, fileName = 'insightdisc-relatorio-organizacional.pdf') {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function exportOrganizationReportPdf({
  title = 'Relatório Executivo Organizacional',
  companyName = 'Empresa',
  generatedAt = new Date().toISOString(),
  executiveSummary = '',
  distribution = {},
  dimensions = [],
  insights = [],
  risks = [],
  recommendations = [],
} = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  y = line(doc, title, 20, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  y = line(doc, `${companyName} • ${new Date(generatedAt).toLocaleDateString('pt-BR')}`, 20, y + 2);

  doc.setFont('helvetica', 'bold');
  y = line(doc, 'Resumo executivo', 20, y + 8);
  doc.setFont('helvetica', 'normal');
  y = line(doc, executiveSummary || 'Resumo não disponível.', 20, y + 1);

  doc.setFont('helvetica', 'bold');
  y = line(doc, 'Distribuição DISC', 20, y + 8);
  doc.setFont('helvetica', 'normal');
  y = line(
    doc,
    `D ${Number(distribution?.D || 0).toFixed(1)}% | I ${Number(distribution?.I || 0).toFixed(1)}% | S ${Number(distribution?.S || 0).toFixed(1)}% | C ${Number(distribution?.C || 0).toFixed(1)}%`,
    20,
    y + 1,
  );

  doc.setFont('helvetica', 'bold');
  y = line(doc, 'Dimensões organizacionais', 20, y + 8);
  doc.setFont('helvetica', 'normal');
  dimensions.forEach((item) => {
    y = line(doc, `${item.label}: ${Number(item.score || 0).toFixed(1)} (${item.level})`, 20, y + 1);
  });

  doc.setFont('helvetica', 'bold');
  y = line(doc, 'Insights e riscos', 20, y + 8);
  doc.setFont('helvetica', 'normal');
  [...insights.slice(0, 4), ...risks.slice(0, 3)].forEach((item) => {
    y = line(doc, `• ${item}`, 20, y + 1);
  });

  doc.setFont('helvetica', 'bold');
  y = line(doc, 'Recomendações estratégicas', 20, y + 8);
  doc.setFont('helvetica', 'normal');
  recommendations.slice(0, 6).forEach((item) => {
    y = line(doc, `• ${item}`, 20, y + 1);
  });

  const blob = doc.output('blob');
  downloadBlob(blob, 'insightdisc-relatorio-organizacional.pdf');
  return { ok: true, blob };
}
