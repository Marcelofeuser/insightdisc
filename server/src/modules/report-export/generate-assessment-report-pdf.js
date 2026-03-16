import { buildAssessmentReportViewModel } from '../reports/reportViewModel.js';
import { renderAssessmentReportPdfHtml } from '../../../../src/modules/reportExport/pdf/reportPdfDocument.js';
import { loadServerBrowserLauncher } from '../report/generate-pdf.js';

const DISC_FACTORS = ['D', 'I', 'S', 'C'];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMap(raw = null) {
  if (!raw || typeof raw !== 'object') return null;
  const map = {};
  let total = 0;

  DISC_FACTORS.forEach((factor) => {
    const value = Math.max(0, toNumber(raw?.[factor]));
    map[factor] = value;
    total += value;
  });

  if (total <= 0) return null;
  return map;
}

function firstMap(candidates = []) {
  for (const candidate of candidates) {
    const normalized = normalizeMap(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function resolveProfileCode(discProfile = {}) {
  const profileCode = String(
    discProfile?.profileCode ||
      discProfile?.profile?.key ||
      discProfile?.profile?.code ||
      discProfile?.combination ||
      '',
  )
    .trim()
    .toUpperCase();

  if (!profileCode) return 'DISC';
  return profileCode;
}

function resolveDominantSecondary(summary = {}, discProfile = {}) {
  const explicitDominant = String(
    discProfile?.dominant || discProfile?.primary || discProfile?.dominantFactor || '',
  )
    .trim()
    .toUpperCase();
  const explicitSecondary = String(
    discProfile?.secondary || discProfile?.secondaryFactor || '',
  )
    .trim()
    .toUpperCase();

  if (DISC_FACTORS.includes(explicitDominant) && DISC_FACTORS.includes(explicitSecondary)) {
    return {
      dominant: explicitDominant,
      secondary: explicitSecondary,
    };
  }

  const profileCode = resolveProfileCode(discProfile);
  const codePrimary = profileCode[0] || '';
  const codeSecondary = profileCode[1] || '';
  if (DISC_FACTORS.includes(codePrimary) && DISC_FACTORS.includes(codeSecondary)) {
    return {
      dominant: codePrimary,
      secondary: codeSecondary,
    };
  }

  const ranking = DISC_FACTORS.map((factor) => ({
    factor,
    value: toNumber(summary?.[factor]),
  })).sort((a, b) => b.value - a.value);

  return {
    dominant: ranking[0]?.factor || 'D',
    secondary: ranking[1]?.factor || 'I',
  };
}

function toReportAssessment(assessment = {}) {
  const discProfile =
    assessment?.report?.discProfile && typeof assessment.report.discProfile === 'object'
      ? assessment.report.discProfile
      : {};

  const summary = firstMap([
    discProfile?.summary,
    discProfile?.charts?.summary,
    discProfile?.scores?.summary,
    discProfile?.normalized,
    assessment?.results?.summary_profile,
    assessment?.disc_results?.summary,
    assessment?.disc_profile?.summary,
  ]);

  const natural = firstMap([
    discProfile?.natural,
    discProfile?.charts?.natural,
    discProfile?.scores?.natural,
    assessment?.results?.natural_profile,
    assessment?.disc_results?.natural,
    assessment?.disc_profile?.natural,
    summary,
  ]);

  const adapted = firstMap([
    discProfile?.adapted,
    discProfile?.charts?.adapted,
    discProfile?.scores?.adapted,
    assessment?.results?.adapted_profile,
    assessment?.disc_results?.adapted,
    assessment?.disc_profile?.adapted,
    summary,
    natural,
  ]);

  const stableSummary = summary || natural || adapted || { D: 25, I: 25, S: 25, C: 25 };
  const { dominant, secondary } = resolveDominantSecondary(stableSummary, discProfile);

  return {
    id: String(assessment?.id || '').trim(),
    assessmentId: String(assessment?.id || '').trim(),
    candidateName: assessment?.candidateName || 'Participante',
    candidateEmail: assessment?.candidateEmail || '',
    completedAt: assessment?.completedAt || assessment?.createdAt || '',
    createdAt: assessment?.createdAt || '',
    results: {
      natural_profile: natural || stableSummary,
      adapted_profile: adapted || stableSummary,
      summary_profile: stableSummary,
      dominant_factor: dominant,
      secondary_factor: secondary,
    },
    disc_profile: {
      summary: stableSummary,
      natural: natural || stableSummary,
      adapted: adapted || stableSummary,
      dominant,
      secondary,
      profileCode: resolveProfileCode(discProfile),
    },
  };
}

function normalizePdfBuffer(pdfBuffer) {
  if (!pdfBuffer) return null;
  if (Buffer.isBuffer(pdfBuffer)) return pdfBuffer;
  if (pdfBuffer instanceof Uint8Array) return Buffer.from(pdfBuffer);
  if (ArrayBuffer.isView(pdfBuffer)) {
    return Buffer.from(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
  }
  if (pdfBuffer instanceof ArrayBuffer) {
    return Buffer.from(pdfBuffer);
  }
  return null;
}

export async function generateAssessmentReportPdf({ assessment } = {}) {
  if (!assessment?.id) {
    const error = new Error('ASSESSMENT_ID_REQUIRED');
    error.statusCode = 400;
    throw error;
  }

  const normalizedAssessment = toReportAssessment(assessment);
  const viewModel = buildAssessmentReportViewModel(normalizedAssessment, {
    assessmentId: normalizedAssessment.id,
  });
  const html = renderAssessmentReportPdfHtml({
    viewModel,
    meta: { generatedAt: new Date().toISOString() },
  });

  const browserLauncher = await loadServerBrowserLauncher();
  const browser = await browserLauncher.launch();

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1800 },
    });
    await page.setContent(html, {
      waitUntil: browserLauncher.name === 'playwright' ? 'networkidle' : 'networkidle0',
    });

    if (typeof page.emulateMediaType === 'function') {
      await page.emulateMediaType('print');
    }

    const pdfRaw = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '10mm',
        right: '8mm',
        bottom: '10mm',
        left: '8mm',
      },
    });

    const pdfBuffer = normalizePdfBuffer(pdfRaw);
    if (!pdfBuffer || !pdfBuffer.length) {
      throw new Error('PDF_UNAVAILABLE');
    }

    return {
      pdfBuffer,
      html,
      fileName: `insightdisc-relatorio-oficial-${normalizedAssessment.id}.pdf`,
      profileCode: viewModel?.interpretation?.profileCode || 'DISC',
    };
  } finally {
    await browser.close();
  }
}

export default generateAssessmentReportPdf;
