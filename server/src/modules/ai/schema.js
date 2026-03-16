import { z } from 'zod';

export const AI_DISC_TONES = ['personal', 'professional', 'business'];
export const AI_DISC_TEXT_FIELDS = {
  summary: { min: 40, max: 1200 },
  executiveSummary: { min: 40, max: 1200 },
  communicationStyle: { min: 40, max: 700 },
  leadershipStyle: { min: 40, max: 700 },
  workStyle: { min: 40, max: 700 },
  pressureBehavior: { min: 40, max: 700 },
  relationshipStyle: { min: 40, max: 700 },
  professionalPositioning: { min: 40, max: 700 },
};
export const AI_DISC_LIST_FIELDS = {
  strengths: { min: 2, max: 8 },
  limitations: { min: 2, max: 8 },
  developmentRecommendations: { min: 2, max: 8 },
  careerRecommendations: { min: 2, max: 8 },
  businessRecommendations: { min: 2, max: 8 },
};

const boundedText = (minimum = 20, maximum = 1200) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum);

const stringList = z
  .array(
    z
      .string()
      .trim()
      .min(3)
      .max(280),
  )
  .min(2)
  .max(8);

export const aiDiscContentSchema = z.object({
  summary: boundedText(40, 1200),
  executiveSummary: boundedText(40, 1200),
  strengths: stringList,
  limitations: stringList,
  communicationStyle: boundedText(40, 700),
  leadershipStyle: boundedText(40, 700),
  workStyle: boundedText(40, 700),
  pressureBehavior: boundedText(40, 700),
  relationshipStyle: boundedText(40, 700),
  developmentRecommendations: stringList,
  careerRecommendations: stringList,
  businessRecommendations: stringList,
  professionalPositioning: boundedText(40, 700),
  tone: z.enum(AI_DISC_TONES),
});

export const aiDiscResponseJsonSchema = {
  $id: 'https://insightdisc.com/schemas/ai-disc-content.json',
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'executiveSummary',
    'strengths',
    'limitations',
    'communicationStyle',
    'leadershipStyle',
    'workStyle',
    'pressureBehavior',
    'relationshipStyle',
    'developmentRecommendations',
    'careerRecommendations',
    'businessRecommendations',
    'professionalPositioning',
    'tone',
  ],
  properties: {
    summary: {
      type: 'string',
      minLength: 40,
      maxLength: 1200,
      description: 'Resumo principal do perfil DISC no tom do modo solicitado.',
    },
    executiveSummary: {
      type: 'string',
      minLength: 40,
      maxLength: 1200,
      description: 'Resumo mais estratégico ou conclusivo, ainda alinhado ao modo.',
    },
    strengths: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: {
        type: 'string',
        minLength: 3,
        maxLength: 280,
      },
    },
    limitations: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: {
        type: 'string',
        minLength: 3,
        maxLength: 280,
      },
    },
    communicationStyle: {
      type: 'string',
      minLength: 40,
      maxLength: 700,
    },
    leadershipStyle: {
      type: 'string',
      minLength: 40,
      maxLength: 700,
    },
    workStyle: {
      type: 'string',
      minLength: 40,
      maxLength: 700,
    },
    pressureBehavior: {
      type: 'string',
      minLength: 40,
      maxLength: 700,
    },
    relationshipStyle: {
      type: 'string',
      minLength: 40,
      maxLength: 700,
    },
    developmentRecommendations: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: {
        type: 'string',
        minLength: 3,
        maxLength: 280,
      },
    },
    careerRecommendations: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: {
        type: 'string',
        minLength: 3,
        maxLength: 280,
      },
    },
    businessRecommendations: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: {
        type: 'string',
        minLength: 3,
        maxLength: 280,
      },
    },
    professionalPositioning: {
      type: 'string',
      minLength: 40,
      maxLength: 700,
    },
    tone: {
      type: 'string',
      enum: AI_DISC_TONES,
    },
  },
};

export function safeValidateAiDiscContent(input) {
  return aiDiscContentSchema.safeParse(input);
}

function uniqueList(items = []) {
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
}

function normalizeTextField(value, fallbackValue, minimumLength) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate.length >= minimumLength) {
    return candidate;
  }

  return String(fallbackValue || '').trim();
}

function normalizeListField(value, fallbackValue = [], maxItems = 8) {
  const candidateItems = Array.isArray(value) ? uniqueList(value) : [];
  const fallbackItems = Array.isArray(fallbackValue) ? uniqueList(fallbackValue) : [];

  return uniqueList([...candidateItems, ...fallbackItems]).slice(0, maxItems);
}

function normalizeSourceTextField(value, minimumLength, maximumLength) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate.length < minimumLength) {
    return '';
  }

  return candidate.slice(0, maximumLength);
}

function normalizeSourceListField(value, maxItems = 8) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueList(
    value
      .map((item) => String(item || '').trim())
      .filter((item) => item.length >= 3)
      .map((item) => item.slice(0, 280)),
  ).slice(0, maxItems);
}

export function extractAiDiscProviderContent(input = {}, mode = 'business') {
  const candidate = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const normalized = {
    summary: normalizeSourceTextField(
      candidate.summary,
      AI_DISC_TEXT_FIELDS.summary.min,
      AI_DISC_TEXT_FIELDS.summary.max,
    ),
    executiveSummary: normalizeSourceTextField(
      candidate.executiveSummary,
      AI_DISC_TEXT_FIELDS.executiveSummary.min,
      AI_DISC_TEXT_FIELDS.executiveSummary.max,
    ),
    strengths: normalizeSourceListField(candidate.strengths, AI_DISC_LIST_FIELDS.strengths.max),
    limitations: normalizeSourceListField(
      candidate.limitations,
      AI_DISC_LIST_FIELDS.limitations.max,
    ),
    communicationStyle: normalizeSourceTextField(
      candidate.communicationStyle,
      AI_DISC_TEXT_FIELDS.communicationStyle.min,
      AI_DISC_TEXT_FIELDS.communicationStyle.max,
    ),
    leadershipStyle: normalizeSourceTextField(
      candidate.leadershipStyle,
      AI_DISC_TEXT_FIELDS.leadershipStyle.min,
      AI_DISC_TEXT_FIELDS.leadershipStyle.max,
    ),
    workStyle: normalizeSourceTextField(
      candidate.workStyle,
      AI_DISC_TEXT_FIELDS.workStyle.min,
      AI_DISC_TEXT_FIELDS.workStyle.max,
    ),
    pressureBehavior: normalizeSourceTextField(
      candidate.pressureBehavior,
      AI_DISC_TEXT_FIELDS.pressureBehavior.min,
      AI_DISC_TEXT_FIELDS.pressureBehavior.max,
    ),
    relationshipStyle: normalizeSourceTextField(
      candidate.relationshipStyle,
      AI_DISC_TEXT_FIELDS.relationshipStyle.min,
      AI_DISC_TEXT_FIELDS.relationshipStyle.max,
    ),
    developmentRecommendations: normalizeSourceListField(
      candidate.developmentRecommendations,
      AI_DISC_LIST_FIELDS.developmentRecommendations.max,
    ),
    careerRecommendations: normalizeSourceListField(
      candidate.careerRecommendations,
      AI_DISC_LIST_FIELDS.careerRecommendations.max,
    ),
    businessRecommendations: normalizeSourceListField(
      candidate.businessRecommendations,
      AI_DISC_LIST_FIELDS.businessRecommendations.max,
    ),
    professionalPositioning: normalizeSourceTextField(
      candidate.professionalPositioning,
      AI_DISC_TEXT_FIELDS.professionalPositioning.min,
      AI_DISC_TEXT_FIELDS.professionalPositioning.max,
    ),
  };

  const content = Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(String(value || '').trim());
    }),
  );

  if (Object.keys(content).length > 0) {
    content.tone = AI_DISC_TONES.includes(candidate.tone) ? candidate.tone : mode;
  }

  return content;
}

export function countMeaningfulAiDiscFields(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return 0;
  }

  let count = 0;

  for (const [field, limits] of Object.entries(AI_DISC_TEXT_FIELDS)) {
    const value = typeof input[field] === 'string' ? input[field].trim() : '';
    if (value.length >= limits.min) {
      count += 1;
    }
  }

  for (const [field] of Object.entries(AI_DISC_LIST_FIELDS)) {
    const value = Array.isArray(input[field]) ? uniqueList(input[field]) : [];
    if (value.length > 0) {
      count += 1;
    }
  }

  return count;
}

export function normalizeAiDiscContentCandidate(input = {}, fallbackContent = {}, mode = 'business') {
  const candidate = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const fallback = fallbackContent && typeof fallbackContent === 'object' ? fallbackContent : {};

  return {
    summary: normalizeTextField(candidate.summary, fallback.summary, AI_DISC_TEXT_FIELDS.summary.min),
    executiveSummary: normalizeTextField(
      candidate.executiveSummary,
      fallback.executiveSummary,
      AI_DISC_TEXT_FIELDS.executiveSummary.min,
    ),
    strengths: normalizeListField(
      candidate.strengths,
      fallback.strengths,
      AI_DISC_LIST_FIELDS.strengths.max,
    ),
    limitations: normalizeListField(
      candidate.limitations,
      fallback.limitations,
      AI_DISC_LIST_FIELDS.limitations.max,
    ),
    communicationStyle: normalizeTextField(
      candidate.communicationStyle,
      fallback.communicationStyle,
      AI_DISC_TEXT_FIELDS.communicationStyle.min,
    ),
    leadershipStyle: normalizeTextField(
      candidate.leadershipStyle,
      fallback.leadershipStyle,
      AI_DISC_TEXT_FIELDS.leadershipStyle.min,
    ),
    workStyle: normalizeTextField(
      candidate.workStyle,
      fallback.workStyle,
      AI_DISC_TEXT_FIELDS.workStyle.min,
    ),
    pressureBehavior: normalizeTextField(
      candidate.pressureBehavior,
      fallback.pressureBehavior,
      AI_DISC_TEXT_FIELDS.pressureBehavior.min,
    ),
    relationshipStyle: normalizeTextField(
      candidate.relationshipStyle,
      fallback.relationshipStyle,
      AI_DISC_TEXT_FIELDS.relationshipStyle.min,
    ),
    developmentRecommendations: normalizeListField(
      candidate.developmentRecommendations,
      fallback.developmentRecommendations,
      AI_DISC_LIST_FIELDS.developmentRecommendations.max,
    ),
    careerRecommendations: normalizeListField(
      candidate.careerRecommendations,
      fallback.careerRecommendations,
      AI_DISC_LIST_FIELDS.careerRecommendations.max,
    ),
    businessRecommendations: normalizeListField(
      candidate.businessRecommendations,
      fallback.businessRecommendations,
      AI_DISC_LIST_FIELDS.businessRecommendations.max,
    ),
    professionalPositioning: normalizeTextField(
      candidate.professionalPositioning,
      fallback.professionalPositioning,
      AI_DISC_TEXT_FIELDS.professionalPositioning.min,
    ),
    tone: AI_DISC_TONES.includes(candidate.tone) ? candidate.tone : mode,
  };
}
