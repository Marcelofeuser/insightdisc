import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const STORE_PATH = path.join(os.tmpdir(), 'disc-pro-dev-store.json');

const DEFAULT_STORE = {
  payments: [],
  unlockedReports: [],
  assessments: {},
};

async function readRawStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STORE, ...parsed };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

async function writeRawStore(next) {
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), 'utf8');
}

export async function addPaymentRecord(record = {}) {
  const current = await readRawStore();
  current.payments.unshift({
    createdAt: new Date().toISOString(),
    ...record,
  });
  await writeRawStore(current);
  return record;
}

export async function unlockAssessment(record = {}) {
  const assessmentId = record?.assessmentId;
  if (!assessmentId) return null;

  const current = await readRawStore();
  const unlockedRecord = {
    assessmentId,
    email: record?.email || '',
    sessionId: record?.sessionId || '',
    unlockedTier: 'pro',
    unlockedAt: new Date().toISOString(),
  };

  const withoutCurrent = current.unlockedReports.filter((item) => item.assessmentId !== assessmentId);
  current.unlockedReports = [unlockedRecord, ...withoutCurrent];

  if (record?.assessmentSnapshot) {
    current.assessments[assessmentId] = record.assessmentSnapshot;
  } else if (!current.assessments[assessmentId]) {
    current.assessments[assessmentId] = {
      id: assessmentId,
      results: {
        dominant_factor: 'D',
        natural_profile: { D: 0, I: 0, S: 0, C: 0 },
      },
    };
  }

  await writeRawStore(current);
  return unlockedRecord;
}

export async function findPaymentBySession(sessionId) {
  if (!sessionId) return null;
  const current = await readRawStore();
  return current.payments.find((item) => item.sessionId === sessionId) || null;
}

export async function getAssessmentSnapshot(assessmentId) {
  if (!assessmentId) return null;
  const current = await readRawStore();
  return current.assessments[assessmentId] || null;
}

export async function upsertAssessmentSnapshot(assessmentId, snapshot = {}) {
  if (!assessmentId) return null;
  const current = await readRawStore();
  current.assessments[assessmentId] = {
    ...(current.assessments[assessmentId] || {}),
    ...snapshot,
    id: assessmentId,
  };
  await writeRawStore(current);
  return current.assessments[assessmentId];
}
