import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  LineChart,
  NotebookPen,
  Trash2,
  UserRound,
} from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';
import { usePremium } from '@/modules/billing/usePremium';
import { canAccessDossier, isSuperAdminAccess } from '@/modules/auth/access-control';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';

const LOCAL_DOSSIER_KEY = 'insightdisc_behavioral_dossiers';
const LOCAL_DOSSIER_ANAMNESIS_KEY = 'insightdisc_dossier_anamnesis';

const DOSSIER_ANAMNESIS_DEFAULT = {
  fullName: '',
  birthDate: '',
  age: '',
  sex: '',
  maritalStatus: '',
  spouseName: '',
  spouseAge: '',
  hasChildren: '',
  childrenCount: '',
  childrenInfo: '',
  city: '',
  address: '',
  profession: '',
  education: '',
  stressLevel: '',
  sleepQuality: '',
  physicalActivity: '',
  smoker: '',
  alcoholConsumption: '',
  usesMedication: '',
  medicationList: '',
  healthConditions: '',
  familyHealthHistory: '',
  psychologicalHistory: '',
  mainComplaint: '',
  evaluationReason: '',
  professionalNotes: '',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function toUpperProfile(value) {
  const raw = String(value || '').trim().toUpperCase();
  return raw || 'DISC';
}

function readLocalStore() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_DOSSIER_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalStore(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_DOSSIER_KEY, JSON.stringify(value || {}));
}

function makeStoreKey(workspaceId, candidateId) {
  return `${String(workspaceId || 'default-workspace').trim()}:${String(candidateId || 'candidate').trim()}`;
}

function ensureLocalRecord({ workspaceId, candidateId, candidateName, candidateEmail }) {
  const store = readLocalStore();
  const key = makeStoreKey(workspaceId, candidateId);

  if (!store[key]) {
    const nowIso = new Date().toISOString();
    store[key] = {
      candidate: {
        id: candidateId,
        name: candidateName || 'Avaliado',
        email: candidateEmail || '-',
      },
      dossier: {
        id: `local-dossier-${candidateId}`,
        notes: [],
        insights: [],
        plans: [],
        reminders: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      assessmentsHistory: [],
      overview: {
        currentProfile: null,
        lastAssessmentAt: null,
        assessmentsCount: 0,
        remindersCount: 0,
        remindersThisMonth: 0,
      },
    };
    writeLocalStore(store);
  }

  return store[key];
}

function recalculateOverview(record) {
  const history = Array.isArray(record?.assessmentsHistory) ? record.assessmentsHistory : [];
  const reminders = Array.isArray(record?.dossier?.reminders) ? record.dossier.reminders : [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const remindersThisMonth = reminders.filter((item) => {
    const date = new Date(item.date);
    return date >= monthStart && date < nextMonth;
  }).length;

  const latest = history[0] || null;

  return {
    ...record,
    overview: {
      currentProfile: latest?.profileKey || null,
      lastAssessmentAt: latest?.completedAt || latest?.createdAt || null,
      assessmentsCount: history.length,
      remindersCount: reminders.length,
      remindersThisMonth,
    },
  };
}

function updateLocalRecord({ workspaceId, candidateId, updater }) {
  const store = readLocalStore();
  const key = makeStoreKey(workspaceId, candidateId);
  const current = store[key] || ensureLocalRecord({ workspaceId, candidateId });
  const updated = updater(current);
  store[key] = recalculateOverview(updated);
  writeLocalStore(store);
  return store[key];
}

function profileEvolutionRows(assessmentsHistory = []) {
  return (Array.isArray(assessmentsHistory) ? assessmentsHistory : [])
    .map((item) => {
      const natural = item?.natural || {};
      return {
        id: item?.id,
        date: item?.completedAt || item?.createdAt,
        profile: toUpperProfile(item?.profileKey),
        D: Number(natural?.D || 0),
        I: Number(natural?.I || 0),
        S: Number(natural?.S || 0),
        C: Number(natural?.C || 0),
      };
    })
    .filter((row) => row.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function readLocalAnamnesisStore() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_DOSSIER_ANAMNESIS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalAnamnesisStore(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_DOSSIER_ANAMNESIS_KEY, JSON.stringify(value || {}));
}

function makeAnamnesisStoreKey(workspaceId, assessmentId) {
  return `${String(workspaceId || 'default-workspace').trim()}:${String(assessmentId || '').trim()}`;
}

function mapAnamnesisForForm(input = {}) {
  const next = { ...DOSSIER_ANAMNESIS_DEFAULT };
  for (const field of Object.keys(next)) {
    if (input[field] === undefined || input[field] === null) continue;
    if (field === 'birthDate') {
      const parsed = new Date(input[field]);
      next.birthDate = Number.isNaN(parsed.getTime())
        ? ''
        : parsed.toISOString().slice(0, 10);
      continue;
    }
    if (field === 'hasChildren') {
      const value = input[field];
      if (typeof value === 'boolean') {
        next.hasChildren = value ? 'sim' : 'não';
      } else {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized === 'true' || normalized === 'sim') next.hasChildren = 'sim';
        else if (normalized === 'false' || normalized === 'não' || normalized === 'nao') {
          next.hasChildren = 'não';
        } else next.hasChildren = '';
      }
      continue;
    }
    next[field] = String(input[field] ?? '');
  }
  return next;
}

function buildAnamnesisPayload(form = {}) {
  const payload = {};
  for (const [key, value] of Object.entries(form || {})) {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      payload[key] = '';
      continue;
    }
    if (['age', 'spouseAge', 'childrenCount'].includes(key)) {
      const parsed = Number(normalized);
      payload[key] = Number.isFinite(parsed) ? parsed : '';
      continue;
    }
    if (key === 'hasChildren') {
      payload[key] = normalized === 'sim' ? true : normalized === 'não' ? false : '';
      continue;
    }
    payload[key] = normalized;
  }
  return payload;
}

function asArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item !== null && item !== undefined);
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function devDossierLog(message, payload = {}) {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.info(`[Dossier] ${message}`, payload);
}

function InlineStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function Dossier() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { access, user } = useAuth();
  const { isPremium } = usePremium();
  const apiBaseUrl = getApiBaseUrl();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const hasDossierAccess = canAccessDossier(access, { notify: false });
  const hasSuperAdminBypass = isSuperAdminAccess(access);

  const workspaceId =
    access?.tenantId ||
    user?.active_workspace_id ||
    user?.tenant_id ||
    'default-workspace';

  const candidateId = String(
    searchParams.get('candidateId') ||
      location.state?.candidateId ||
      location.state?.candidate?.id ||
      ''
  ).trim();
  const assessmentId = String(searchParams.get('assessmentId') || '').trim();
  const dossierQueryKey = useMemo(
    () => ['behavioral-dossier', apiBaseUrl, workspaceId, candidateId],
    [apiBaseUrl, workspaceId, candidateId]
  );

  const [noteContent, setNoteContent] = useState('');
  const [insightContent, setInsightContent] = useState('');
  const [planGoal, setPlanGoal] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingItemKey, setDeletingItemKey] = useState('');
  const [anamnesisForm, setAnamnesisForm] = useState(DOSSIER_ANAMNESIS_DEFAULT);
  const [isSavingAnamnesis, setIsSavingAnamnesis] = useState(false);
  const [anamnesisSaveError, setAnamnesisSaveError] = useState('');
  const [anamnesisStatusLabel, setAnamnesisStatusLabel] = useState('');
  const [hasAnamnesisData, setHasAnamnesisData] = useState(false);
  const linkedAssessmentRef = useRef(false);
  const anamnesisLoadedRef = useRef(false);
  const anamnesisDirtyRef = useRef(false);

  const dossierQuery = useQuery({
    queryKey: dossierQueryKey,
    enabled: Boolean(candidateId),
    queryFn: async () => {
      if (apiBaseUrl) {
        const payload = await apiRequest(
          `/api/dossier/${encodeURIComponent(candidateId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
          {
            method: 'GET',
            requireAuth: true,
          }
        );
        return payload;
      }

      const local = ensureLocalRecord({
        workspaceId,
        candidateId,
        candidateName:
          searchParams.get('candidateName') ||
          location.state?.candidateName ||
          location.state?.candidate?.name ||
          '-',
        candidateEmail:
          searchParams.get('candidateEmail') ||
          location.state?.candidateEmail ||
          location.state?.candidate?.email ||
          '-',
      });
      return {
        ok: true,
        workspaceId,
        candidate: local.candidate,
        dossier: local.dossier,
        assessmentsHistory: local.assessmentsHistory,
        overview: local.overview,
      };
    },
  });

  const historyQuery = useQuery({
    queryKey: ['assessment-history', apiBaseUrl, access?.userId, workspaceId],
    enabled:
      Boolean(apiBaseUrl) &&
      Boolean(access?.userId) &&
      !candidateId &&
      (hasSuperAdminBypass || (isPremium && hasDossierAccess)),
    queryFn: async () => {
      const payload = await apiRequest('/assessment/history', {
        method: 'GET',
        requireAuth: true,
      });
      return Array.isArray(payload?.history) ? payload.history : [];
    },
  });

  const effectiveAssessmentId = useMemo(() => {
    if (assessmentId) return assessmentId;
    const fallbackAssessment = asArray(dossierQuery.data?.assessmentsHistory)?.[0]?.id;
    return String(fallbackAssessment || '').trim();
  }, [assessmentId, dossierQuery.data?.assessmentsHistory]);

  const anamnesisQuery = useQuery({
    queryKey: ['dossier-anamnesis', apiBaseUrl, workspaceId, effectiveAssessmentId],
    enabled: Boolean(candidateId) && Boolean(effectiveAssessmentId),
    queryFn: async () => {
      if (apiBaseUrl) {
        return apiRequest(
          `/api/dossier/anamnesis/${encodeURIComponent(
            effectiveAssessmentId,
          )}?workspaceId=${encodeURIComponent(workspaceId)}`,
          {
            method: 'GET',
            requireAuth: true,
          },
        );
      }

      const store = readLocalAnamnesisStore();
      const key = makeAnamnesisStoreKey(workspaceId, effectiveAssessmentId);
      const localValue = store[key] || null;
      return {
        ok: true,
        assessment: {
          assessmentId: effectiveAssessmentId,
          candidateId,
          candidateName:
            searchParams.get('candidateName') ||
            location.state?.candidateName ||
            location.state?.candidate?.name ||
            'Participante',
          candidateEmail:
            searchParams.get('candidateEmail') ||
            location.state?.candidateEmail ||
            location.state?.candidate?.email ||
            '',
        },
        anamnesis: localValue,
        hasData: Boolean(localValue),
      };
    },
  });

  const data = asObject(dossierQuery.data);
  const candidate = asObject(data?.candidate);
  const dossier = asObject(data?.dossier);
  const overview = asObject(data?.overview);
  const assessmentsHistory = asArray(data?.assessmentsHistory);
  const historyRows = asArray(historyQuery.data).filter(
    (item) => item && typeof item === 'object',
  );
  const dossierNotes = asArray(dossier?.notes);
  const dossierInsights = asArray(dossier?.insights);
  const dossierPlans = asArray(dossier?.plans);
  const dossierReminders = asArray(dossier?.reminders);
  const hasRenderableDossierData = Boolean(
    String(candidate?.id || '').trim() ||
      String(candidate?.name || '').trim() ||
      String(dossier?.id || '').trim() ||
      assessmentsHistory.length ||
      dossierNotes.length ||
      dossierInsights.length ||
      dossierPlans.length ||
      dossierReminders.length,
  );

  const evolutionRows = useMemo(
    () => profileEvolutionRows(assessmentsHistory),
    [assessmentsHistory]
  );

  useEffect(() => {
    if (!assessmentId || linkedAssessmentRef.current || !candidateId) return;
    if (!hasRenderableDossierData) return;

    const alreadyLinked = dossierNotes.some((note) =>
      String(note?.content || '').includes(assessmentId)
    );

    if (alreadyLinked) {
      linkedAssessmentRef.current = true;
      return;
    }

    linkedAssessmentRef.current = true;

    const autoNote = `Avaliação vinculada ao dossiê. ID da avaliação: ${assessmentId}.`;

    const createAutoLink = async () => {
      try {
        if (apiBaseUrl) {
          await apiRequest(`/api/dossier/${encodeURIComponent(candidateId)}/note`, {
            method: 'POST',
            requireAuth: true,
            body: {
              content: autoNote,
              workspaceId,
            },
          });
        } else {
          updateLocalRecord({
            workspaceId,
            candidateId,
            updater: (current) => {
              const next = {
                ...current,
                dossier: {
                  ...current.dossier,
                  notes: [
                    {
                      id: `local-note-${Date.now()}`,
                      authorId: access?.userId || 'local-author',
                      content: autoNote,
                      createdAt: new Date().toISOString(),
                    },
                    ...(current?.dossier?.notes || []),
                  ],
                  updatedAt: new Date().toISOString(),
                },
              };
              return next;
            },
          });
        }

        await queryClient.invalidateQueries({ queryKey: dossierQueryKey });
      } catch {
        // vínculo automático falhou; não interrompe a tela.
      }
    };

    createAutoLink();
  }, [
    apiBaseUrl,
    assessmentId,
    candidateId,
    dossierNotes,
    hasRenderableDossierData,
    workspaceId,
    access?.userId,
    queryClient,
    dossierQueryKey,
  ]);

  useEffect(() => {
    if (!candidateId || !effectiveAssessmentId) return;
    if (!anamnesisQuery.isSuccess) return;

    const mapped = mapAnamnesisForForm(anamnesisQuery.data?.anamnesis || {});
    setAnamnesisForm(mapped);
    setHasAnamnesisData(Boolean(anamnesisQuery.data?.hasData));
    setAnamnesisSaveError('');
    setAnamnesisStatusLabel('');
    anamnesisLoadedRef.current = true;
    anamnesisDirtyRef.current = false;
  }, [
    candidateId,
    effectiveAssessmentId,
    anamnesisQuery.isSuccess,
    anamnesisQuery.data?.anamnesis,
    anamnesisQuery.data?.hasData,
  ]);

  useEffect(() => {
    if (!anamnesisLoadedRef.current || !anamnesisDirtyRef.current) return;
    if (!candidateId || !effectiveAssessmentId) return;

    const timeout = setTimeout(async () => {
      const payload = buildAnamnesisPayload(anamnesisForm);
      setIsSavingAnamnesis(true);
      setAnamnesisSaveError('');
      setAnamnesisStatusLabel('Salvando...');

      try {
        if (apiBaseUrl) {
          const response = await apiRequest('/api/dossier/anamnesis/save', {
            method: 'POST',
            requireAuth: true,
            body: {
              workspaceId,
              assessmentId: effectiveAssessmentId,
              ...payload,
            },
          });
          setHasAnamnesisData(Boolean(response?.hasData));
          queryClient.setQueryData(
            ['dossier-anamnesis', apiBaseUrl, workspaceId, effectiveAssessmentId],
            response,
          );
        } else {
          const store = readLocalAnamnesisStore();
          const key = makeAnamnesisStoreKey(workspaceId, effectiveAssessmentId);
          store[key] = payload;
          writeLocalAnamnesisStore(store);
          setHasAnamnesisData(true);
        }

        anamnesisDirtyRef.current = false;
        setAnamnesisStatusLabel('Salvo automaticamente');
      } catch (error) {
        const message =
          String(error?.payload?.message || error?.message || '').trim() ||
          'Não foi possível salvar a anamnese agora.';
        setAnamnesisSaveError(message);
        setAnamnesisStatusLabel('');
      } finally {
        setIsSavingAnamnesis(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    anamnesisForm,
    candidateId,
    effectiveAssessmentId,
    apiBaseUrl,
    workspaceId,
    queryClient,
  ]);

  const handleAnamnesisChange = (field, value) => {
    anamnesisDirtyRef.current = true;
    setAnamnesisStatusLabel('Alterações pendentes');
    setAnamnesisForm((prev) => ({ ...prev, [field]: value }));
  };

  const createRecord = async (kind) => {
    if (!candidateId) {
      toast({
        variant: 'destructive',
        title: 'Ação indisponível',
        description: 'Selecione um avaliado antes de salvar no Dossiê.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const syncQueryWithPayload = (payload) => {
        if (!payload?.dossier) return false;
        queryClient.setQueryData(dossierQueryKey, payload);
        return true;
      };

      if (kind === 'note') {
        const normalizedContent = noteContent.trim();
        if (!normalizedContent) {
          toast({
            variant: 'destructive',
            title: 'Anotação vazia',
            description: 'Digite uma anotação antes de salvar.',
          });
          return;
        }

        if (apiBaseUrl) {
          const payload = await apiRequest(`/api/dossier/${encodeURIComponent(candidateId)}/note`, {
            method: 'POST',
            requireAuth: true,
            body: {
              content: normalizedContent,
              workspaceId,
            },
          });
          syncQueryWithPayload(payload);
        } else {
          const payload = updateLocalRecord({
            workspaceId,
            candidateId,
            updater: (current) => ({
              ...current,
              dossier: {
                ...current.dossier,
                notes: [
                  {
                    id: `local-note-${Date.now()}`,
                    authorId: access?.userId || 'local-author',
                    content: normalizedContent,
                    createdAt: new Date().toISOString(),
                  },
                  ...(current?.dossier?.notes || []),
                ],
                updatedAt: new Date().toISOString(),
              },
            }),
          });
          queryClient.setQueryData(dossierQueryKey, {
            ok: true,
            workspaceId,
            candidate: payload.candidate,
            dossier: payload.dossier,
            assessmentsHistory: payload.assessmentsHistory,
            overview: payload.overview,
          });
        }
        setNoteContent('');
      }

      if (kind === 'insight') {
        const normalizedInsight = insightContent.trim();
        if (!normalizedInsight) {
          toast({
            variant: 'destructive',
            title: 'Insight vazio',
            description: 'Digite um insight antes de salvar.',
          });
          return;
        }

        if (apiBaseUrl) {
          const payload = await apiRequest(`/api/dossier/${encodeURIComponent(candidateId)}/insight`, {
            method: 'POST',
            requireAuth: true,
            body: {
              insight: normalizedInsight,
              workspaceId,
            },
          });
          syncQueryWithPayload(payload);
        } else {
          const payload = updateLocalRecord({
            workspaceId,
            candidateId,
            updater: (current) => ({
              ...current,
              dossier: {
                ...current.dossier,
                insights: [
                  {
                    id: `local-insight-${Date.now()}`,
                    authorId: access?.userId || 'local-author',
                    insight: normalizedInsight,
                    createdAt: new Date().toISOString(),
                  },
                  ...(current?.dossier?.insights || []),
                ],
                updatedAt: new Date().toISOString(),
              },
            }),
          });
          queryClient.setQueryData(dossierQueryKey, {
            ok: true,
            workspaceId,
            candidate: payload.candidate,
            dossier: payload.dossier,
            assessmentsHistory: payload.assessmentsHistory,
            overview: payload.overview,
          });
        }
        setInsightContent('');
      }

      if (kind === 'plan') {
        const normalizedGoal = planGoal.trim();
        const normalizedDescription = planDescription.trim();
        if (!normalizedGoal || !normalizedDescription) {
          toast({
            variant: 'destructive',
            title: 'Plano incompleto',
            description: 'Preencha objetivo e descrição para salvar o plano.',
          });
          return;
        }

        if (apiBaseUrl) {
          const payload = await apiRequest(`/api/dossier/${encodeURIComponent(candidateId)}/plan`, {
            method: 'POST',
            requireAuth: true,
            body: {
              goal: normalizedGoal,
              description: normalizedDescription,
              workspaceId,
            },
          });
          syncQueryWithPayload(payload);
        } else {
          const payload = updateLocalRecord({
            workspaceId,
            candidateId,
            updater: (current) => ({
              ...current,
              dossier: {
                ...current.dossier,
                plans: [
                  {
                    id: `local-plan-${Date.now()}`,
                    goal: normalizedGoal,
                    description: normalizedDescription,
                    createdAt: new Date().toISOString(),
                  },
                  ...(current?.dossier?.plans || []),
                ],
                updatedAt: new Date().toISOString(),
              },
            }),
          });
          queryClient.setQueryData(dossierQueryKey, {
            ok: true,
            workspaceId,
            candidate: payload.candidate,
            dossier: payload.dossier,
            assessmentsHistory: payload.assessmentsHistory,
            overview: payload.overview,
          });
        }

        setPlanGoal('');
        setPlanDescription('');
      }

      if (kind === 'reminder') {
        const normalizedReminderNote = reminderNote.trim();
        if (!reminderDate || !normalizedReminderNote) {
          toast({
            variant: 'destructive',
            title: 'Agendamento incompleto',
            description: 'Preencha data/hora e observação para salvar o agendamento.',
          });
          return;
        }
        const parsedReminderDate = new Date(reminderDate);
        if (Number.isNaN(parsedReminderDate.getTime())) {
          toast({
            variant: 'destructive',
            title: 'Data inválida',
            description: 'Informe uma data de reavaliação válida.',
          });
          return;
        }
        const reminderIso = parsedReminderDate.toISOString();

        if (apiBaseUrl) {
          const payload = await apiRequest(`/api/dossier/${encodeURIComponent(candidateId)}/reminder`, {
            method: 'POST',
            requireAuth: true,
            body: {
              date: reminderIso,
              note: normalizedReminderNote,
              workspaceId,
            },
          });
          syncQueryWithPayload(payload);
        } else {
          const payload = updateLocalRecord({
            workspaceId,
            candidateId,
            updater: (current) => ({
              ...current,
              dossier: {
                ...current.dossier,
                reminders: [
                  ...(current?.dossier?.reminders || []),
                  {
                    id: `local-reminder-${Date.now()}`,
                    date: reminderIso,
                    note: normalizedReminderNote,
                    createdAt: new Date().toISOString(),
                  },
                ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
                updatedAt: new Date().toISOString(),
              },
            }),
          });
          queryClient.setQueryData(dossierQueryKey, {
            ok: true,
            workspaceId,
            candidate: payload.candidate,
            dossier: payload.dossier,
            assessmentsHistory: payload.assessmentsHistory,
            overview: payload.overview,
          });
        }

        setReminderDate('');
        setReminderNote('');
      }

      await queryClient.invalidateQueries({ queryKey: dossierQueryKey });
      toast({
        title: 'Dossiê atualizado',
        description: 'Registro salvo com sucesso.',
      });
    } catch (error) {
      const errorCode = String(error?.payload?.error || error?.message || '').toUpperCase();
      const isPremiumError = errorCode.includes('DOSSIER_PREMIUM_REQUIRED');
      const isCandidateRequired = errorCode.includes('CANDIDATE_ID_REQUIRED');
      const isWorkspaceError =
        errorCode.includes('WORKSPACE_NOT_FOUND') || errorCode.includes('FORBIDDEN_WORKSPACE');
      const isServerUnavailable =
        errorCode.includes('FAILED TO FETCH') ||
        errorCode.includes('API_BASE_URL_NOT_CONFIGURED') ||
        errorCode.includes('DOSSIER_PRISMA_CLIENT_OUTDATED');

      toast({
        variant: 'destructive',
        title: isPremiumError
          ? 'Plano premium necessário'
          : isCandidateRequired
            ? 'Avaliado não selecionado'
            : 'Falha ao salvar',
        description: isPremiumError
          ? 'Este recurso está disponível apenas para planos Professional, Business e Enterprise.'
          : isCandidateRequired
            ? 'Selecione um avaliado antes de salvar.'
            : isWorkspaceError
              ? 'Não foi possível resolver o workspace do dossiê.'
              : isServerUnavailable
                ? 'Backend do Dossiê não respondeu. Verifique se a API está ativa.'
                : 'Não foi possível salvar o registro.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecord = async (kind, itemId) => {
    if (!candidateId) {
      toast({
        variant: 'destructive',
        title: 'Ação indisponível',
        description: 'Selecione um avaliado antes de excluir um registro.',
      });
      return;
    }

    const normalizedKind = String(kind || '').trim();
    const normalizedItemId = String(itemId || '').trim();
    if (!normalizedKind || !normalizedItemId) return;

    const entryKey = `${normalizedKind}:${normalizedItemId}`;
    setDeletingItemKey(entryKey);

    try {
      const kindConfig = {
        note: { endpoint: 'note', label: 'anotação', collection: 'notes' },
        insight: { endpoint: 'insight', label: 'insight', collection: 'insights' },
        plan: { endpoint: 'plan', label: 'plano', collection: 'plans' },
        reminder: { endpoint: 'reminder', label: 'agendamento', collection: 'reminders' },
      }[normalizedKind];

      if (!kindConfig) return;

      const syncQueryWithPayload = (payload) => {
        if (!payload?.dossier) return false;
        queryClient.setQueryData(dossierQueryKey, payload);
        return true;
      };

      if (apiBaseUrl) {
        const payload = await apiRequest(
          `/api/dossier/${encodeURIComponent(candidateId)}/${kindConfig.endpoint}/${encodeURIComponent(
            normalizedItemId,
          )}?workspaceId=${encodeURIComponent(workspaceId)}`,
          {
            method: 'DELETE',
            requireAuth: true,
          },
        );
        syncQueryWithPayload(payload);
      } else {
        const payload = updateLocalRecord({
          workspaceId,
          candidateId,
          updater: (current) => ({
            ...current,
            dossier: {
              ...current.dossier,
              [kindConfig.collection]: (current?.dossier?.[kindConfig.collection] || []).filter(
                (item) => String(item?.id || '') !== normalizedItemId,
              ),
              updatedAt: new Date().toISOString(),
            },
          }),
        });

        queryClient.setQueryData(dossierQueryKey, {
          ok: true,
          workspaceId,
          candidate: payload.candidate,
          dossier: payload.dossier,
          assessmentsHistory: payload.assessmentsHistory,
          overview: payload.overview,
        });
      }

      await queryClient.invalidateQueries({ queryKey: dossierQueryKey });
      toast({
        title: 'Registro removido',
        description: `${kindConfig.label} excluído com sucesso.`,
      });
    } catch (error) {
      const code = String(error?.payload?.error || error?.message || '').toUpperCase();
      const labelByKind = {
        note: 'anotação',
        insight: 'insight',
        plan: 'plano',
        reminder: 'agendamento',
      };
      const label = labelByKind[normalizedKind] || 'registro';

      toast({
        variant: 'destructive',
        title: 'Falha ao excluir',
        description:
          code.includes('NOT_FOUND') || code.includes('ITEM_ID_REQUIRED')
            ? `Não foi possível localizar este ${label} para exclusão.`
            : 'Não foi possível excluir o registro.',
      });
    } finally {
      setDeletingItemKey('');
    }
  };

  if ((!isPremium && !hasSuperAdminBypass) || !hasDossierAccess) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Dossiê Comportamental</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Recurso premium disponível apenas nos planos Professional, Business e Enterprise.
            </p>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => (window.location.href = '/Pricing')}>
              Ver planos premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!candidateId) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Nenhum dossiê selecionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Abra um relatório ou selecione um avaliado para visualizar o dossiê comportamental.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Ir para Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate(createPageUrl('MyAssessments'))}>
                Minhas Avaliações
              </Button>
            </div>
            {historyQuery.isLoading ? (
              <div className="space-y-2">
                <div className="h-10 rounded-md bg-slate-100 animate-pulse" />
                <div className="h-10 rounded-md bg-slate-100 animate-pulse" />
                <div className="h-10 rounded-md bg-slate-100 animate-pulse" />
              </div>
            ) : historyRows.length ? (
              <div className="space-y-2 pt-2">
                {historyRows.map((item, index) => {
                  const rowCandidateId = String(item?.candidateId || '').trim();
                  const rowAssessmentId = String(item?.assessmentId || '').trim();
                  return (
                    <div
                      key={`${rowCandidateId || 'candidate'}-${rowAssessmentId || String(index)}`}
                      className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {item?.candidateName || 'Participante'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {item?.candidateEmail || '-'} • Perfil {toUpperProfile(item?.profile)} •{' '}
                          {formatDate(item?.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={!rowCandidateId || !rowAssessmentId}
                        onClick={() =>
                          navigate(
                            `/Dossier?candidateId=${encodeURIComponent(
                              rowCandidateId,
                            )}&assessmentId=${encodeURIComponent(rowAssessmentId)}`,
                          )
                        }
                      >
                        Abrir dossiê
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Nenhum histórico de avaliação disponível para este workspace.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (dossierQuery.isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />
        <div className="h-52 rounded-xl bg-slate-100 animate-pulse" />
        <div className="h-80 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (dossierQuery.isError) {
    const status = Number(dossierQuery.error?.status || 0);
    const errorCode = String(
      dossierQuery.error?.payload?.error || dossierQuery.error?.message || 'DOSSIER_FETCH_FAILED'
    ).toUpperCase();
    const isNotFoundError =
      status === 404 ||
      errorCode.includes('CANDIDATE_NOT_FOUND') ||
      errorCode.includes('DOSSIER_NOT_FOUND') ||
      errorCode.includes('NOT_FOUND');
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isNotFoundError ? 'Dossiê não encontrado' : 'Não foi possível carregar o Dossiê'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              {isNotFoundError
                ? 'Não encontramos dados para os parâmetros informados.'
                : errorCode.includes('DOSSIER_PRISMA_CLIENT_OUTDATED')
                  ? 'Backend com Prisma desatualizado. Execute prisma generate.'
                  : 'Falha ao buscar os dados do dossiê.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Voltar ao Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate(createPageUrl('MyAssessments'))}>
                Minhas Avaliações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasRenderableDossierData) {
    devDossierLog('payload vazio para candidateId informado', {
      candidateId,
      assessmentId,
      hasApiBaseUrl: Boolean(apiBaseUrl),
      dataKeys: Object.keys(data || {}),
    });
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Dossiê não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Não encontramos dados para os parâmetros informados.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Voltar ao Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate(createPageUrl('MyAssessments'))}>
                Minhas Avaliações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900">Dossiê Comportamental</h1>
          <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200">Premium</Badge>
          {hasSuperAdminBypass ? (
            <Badge className="bg-amber-100 text-amber-800 border border-amber-200">SUPER ADMIN</Badge>
          ) : null}
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <InlineStat icon={UserRound} label="Avaliado" value={candidate?.name || 'Participante'} />
          <InlineStat icon={ClipboardList} label="Perfil DISC atual" value={toUpperProfile(overview?.currentProfile)} />
          <InlineStat icon={CalendarClock} label="Última avaliação" value={formatDate(overview?.lastAssessmentAt)} />
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          <TabsTrigger value="overview" className="border border-slate-200 rounded-xl">Visão Geral</TabsTrigger>
          <TabsTrigger value="notes" className="border border-slate-200 rounded-xl">Anotações</TabsTrigger>
          <TabsTrigger value="insights" className="border border-slate-200 rounded-xl">Insights</TabsTrigger>
          <TabsTrigger value="plans" className="border border-slate-200 rounded-xl">Plano de Desenvolvimento</TabsTrigger>
          <TabsTrigger value="reminders" className="border border-slate-200 rounded-xl">Agendamentos</TabsTrigger>
          <TabsTrigger value="anamnesis" className="border border-slate-200 rounded-xl">Anamnese</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Histórico de avaliações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-600">
                <p>Total de avaliações: <strong className="text-slate-900">{overview?.assessmentsCount || 0}</strong></p>
                <p>Dossiês ativos no período: <strong className="text-slate-900">1</strong></p>
                <p>Reavaliações neste mês: <strong className="text-slate-900">{overview?.remindersThisMonth || 0}</strong></p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChart className="w-4 h-4" />
                  Evolução comportamental
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evolutionRows.length === 0 ? (
                  <p className="text-sm text-slate-500">Sem histórico suficiente para exibir evolução.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-200">
                          <th className="py-2 pr-3">Data</th>
                          <th className="py-2 pr-3">Perfil</th>
                          <th className="py-2 pr-3">D</th>
                          <th className="py-2 pr-3">I</th>
                          <th className="py-2 pr-3">S</th>
                          <th className="py-2 pr-3">C</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evolutionRows.slice(0, 12).map((row) => (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="py-2 pr-3">{formatDate(row.date)}</td>
                            <td className="py-2 pr-3"><Badge variant="outline">{row.profile}</Badge></td>
                            <td className="py-2 pr-3">{row.D}%</td>
                            <td className="py-2 pr-3">{row.I}%</td>
                            <td className="py-2 pr-3">{row.S}%</td>
                            <td className="py-2 pr-3">{row.C}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Timeline de avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              {assessmentsHistory.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma avaliação vinculada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {assessmentsHistory.map((item, index) => (
                    <div key={String(item?.id || index)} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="font-medium text-slate-900">
                          {item?.candidateName || candidate?.name || 'Avaliado'}
                        </div>
                        <Badge variant="outline">{toUpperProfile(item?.profileKey)}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Criada em {formatDateTime(item?.createdAt)}
                        {item?.completedAt ? ` • Concluída em ${formatDateTime(item?.completedAt)}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Nova anotação privada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Ex: Alta dominância. Precisa trabalhar escuta ativa em reuniões de alinhamento."
                rows={4}
              />
              <Button
                onClick={() => createRecord('note')}
                disabled={isSubmitting || !noteContent.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <NotebookPen className="w-4 h-4 mr-2" />
                Salvar anotação
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Histórico de anotações</CardTitle>
            </CardHeader>
            <CardContent>
              {dossierNotes.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma anotação registrada.</p>
              ) : (
                <div className="space-y-3">
                  {dossierNotes.map((note, index) => (
                    <div key={String(note?.id || index)} className="rounded-xl border border-slate-200 p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{note?.content || ''}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingItemKey === `note:${note?.id}`}
                          onClick={() => deleteRecord('note', note?.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Apagar
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">{formatDateTime(note?.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Novo insight comportamental</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={insightContent}
                onChange={(event) => setInsightContent(event.target.value)}
                placeholder="Ex: Perfil dominante pode performar melhor em liderança comercial com metas de curto ciclo."
                rows={4}
              />
              <Button
                onClick={() => createRecord('insight')}
                disabled={isSubmitting || !insightContent.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Salvar insight
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Insights estratégicos</CardTitle>
            </CardHeader>
            <CardContent>
              {dossierInsights.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum insight registrado.</p>
              ) : (
                <div className="space-y-3">
                  {dossierInsights.map((insight, index) => (
                    <div key={String(insight?.id || index)} className="rounded-xl border border-slate-200 p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{insight?.insight || ''}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingItemKey === `insight:${insight?.id}`}
                          onClick={() => deleteRecord('insight', insight?.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Apagar
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">{formatDateTime(insight?.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Criar plano de desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={planGoal}
                onChange={(event) => setPlanGoal(event.target.value)}
                placeholder="Objetivo (ex: Desenvolver comunicação assertiva)"
              />
              <Textarea
                value={planDescription}
                onChange={(event) => setPlanDescription(event.target.value)}
                placeholder="Descrição (ex: Treinar feedback construtivo em rituais semanais.)"
                rows={4}
              />
              <Button
                onClick={() => createRecord('plan')}
                disabled={isSubmitting || !planGoal.trim() || !planDescription.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Salvar plano
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Planos ativos</CardTitle>
            </CardHeader>
            <CardContent>
              {dossierPlans.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum plano cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {dossierPlans.map((plan, index) => (
                    <div key={String(plan?.id || index)} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-slate-900">{plan?.goal || ''}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingItemKey === `plan:${plan?.id}`}
                          onClick={() => deleteRecord('plan', plan?.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Apagar
                        </Button>
                      </div>
                      <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{plan?.description || ''}</p>
                      <p className="text-xs text-slate-500 mt-2">{formatDateTime(plan?.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Agendar reavaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="datetime-local"
                value={reminderDate}
                onChange={(event) => setReminderDate(event.target.value)}
              />
              <Textarea
                value={reminderNote}
                onChange={(event) => setReminderNote(event.target.value)}
                placeholder="Ex: Reavaliar em 6 meses para medir evolução de comunicação e adaptação."
                rows={3}
              />
              <Button
                onClick={() => createRecord('reminder')}
                disabled={isSubmitting || !reminderDate || !reminderNote.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                Salvar agendamento
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Próximas reavaliações</CardTitle>
            </CardHeader>
            <CardContent>
              {dossierReminders.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum lembrete programado.</p>
              ) : (
                <div className="space-y-3">
                  {dossierReminders.map((reminder, index) => (
                    <div key={String(reminder?.id || index)} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium text-slate-900">{formatDateTime(reminder?.date)}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Agendado</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingItemKey === `reminder:${reminder?.id}`}
                            onClick={() => deleteRecord('reminder', reminder?.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Apagar
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{reminder?.note || ''}</p>
                      <p className="text-xs text-slate-500 mt-2">Criado em {formatDateTime(reminder?.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anamnesis" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Anamnese profissional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Estas informações são utilizadas apenas para contextualização da avaliação
                comportamental.
              </p>
              {!effectiveAssessmentId ? (
                <p className="text-sm text-slate-500">
                  Selecione uma avaliação deste participante para preencher a anamnese.
                </p>
              ) : null}
              {anamnesisQuery.isLoading ? (
                <div className="space-y-2">
                  <div className="h-10 rounded-md bg-slate-100 animate-pulse" />
                  <div className="h-10 rounded-md bg-slate-100 animate-pulse" />
                  <div className="h-10 rounded-md bg-slate-100 animate-pulse" />
                </div>
              ) : null}
              {!anamnesisQuery.isLoading && effectiveAssessmentId && !hasAnamnesisData ? (
                <p className="text-sm text-slate-500">Anamnese ainda não preenchida.</p>
              ) : null}
              {!anamnesisQuery.isLoading && effectiveAssessmentId ? (
                <div className="text-xs text-slate-500">
                  {isSavingAnamnesis ? 'Salvando...' : anamnesisStatusLabel || 'Edite os campos abaixo.'}
                </div>
              ) : null}
              {anamnesisSaveError ? (
                <p className="text-sm text-red-600">{anamnesisSaveError}</p>
              ) : null}
            </CardContent>
          </Card>

          {effectiveAssessmentId ? (
            <>
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Identificação</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={anamnesisForm.fullName}
                    onChange={(event) => handleAnamnesisChange('fullName', event.target.value)}
                    placeholder="Nome completo"
                  />
                  <Input
                    type="date"
                    value={anamnesisForm.birthDate}
                    onChange={(event) => handleAnamnesisChange('birthDate', event.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={anamnesisForm.age}
                    onChange={(event) => handleAnamnesisChange('age', event.target.value)}
                    placeholder="Idade"
                  />
                  <Input
                    value={anamnesisForm.sex}
                    onChange={(event) => handleAnamnesisChange('sex', event.target.value)}
                    placeholder="Sexo"
                  />
                  <Input
                    value={anamnesisForm.maritalStatus}
                    onChange={(event) =>
                      handleAnamnesisChange('maritalStatus', event.target.value)
                    }
                    placeholder="Estado civil"
                  />
                  <Input
                    value={anamnesisForm.profession}
                    onChange={(event) => handleAnamnesisChange('profession', event.target.value)}
                    placeholder="Profissão"
                  />
                  <Input
                    value={anamnesisForm.education}
                    onChange={(event) => handleAnamnesisChange('education', event.target.value)}
                    placeholder="Escolaridade"
                  />
                  <Input
                    value={anamnesisForm.city}
                    onChange={(event) => handleAnamnesisChange('city', event.target.value)}
                    placeholder="Cidade"
                  />
                  <div className="md:col-span-2">
                    <Input
                      value={anamnesisForm.address}
                      onChange={(event) => handleAnamnesisChange('address', event.target.value)}
                      placeholder="Endereço"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Família</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={anamnesisForm.spouseName}
                    onChange={(event) => handleAnamnesisChange('spouseName', event.target.value)}
                    placeholder="Nome do cônjuge"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={anamnesisForm.spouseAge}
                    onChange={(event) => handleAnamnesisChange('spouseAge', event.target.value)}
                    placeholder="Idade do cônjuge"
                  />
                  <Input
                    value={anamnesisForm.hasChildren}
                    onChange={(event) => handleAnamnesisChange('hasChildren', event.target.value)}
                    placeholder="Tem filhos? (sim/não)"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={anamnesisForm.childrenCount}
                    onChange={(event) => handleAnamnesisChange('childrenCount', event.target.value)}
                    placeholder="Quantidade de filhos"
                  />
                  <div className="md:col-span-2">
                    <Textarea
                      rows={3}
                      value={anamnesisForm.childrenInfo}
                      onChange={(event) => handleAnamnesisChange('childrenInfo', event.target.value)}
                      placeholder="Informações dos filhos"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Saúde</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={anamnesisForm.stressLevel}
                    onChange={(event) => handleAnamnesisChange('stressLevel', event.target.value)}
                    placeholder="Nível de estresse"
                  />
                  <Input
                    value={anamnesisForm.sleepQuality}
                    onChange={(event) => handleAnamnesisChange('sleepQuality', event.target.value)}
                    placeholder="Qualidade do sono"
                  />
                  <Input
                    value={anamnesisForm.physicalActivity}
                    onChange={(event) =>
                      handleAnamnesisChange('physicalActivity', event.target.value)
                    }
                    placeholder="Atividade física"
                  />
                  <Input
                    value={anamnesisForm.smoker}
                    onChange={(event) => handleAnamnesisChange('smoker', event.target.value)}
                    placeholder="Tabagismo"
                  />
                  <Input
                    value={anamnesisForm.alcoholConsumption}
                    onChange={(event) =>
                      handleAnamnesisChange('alcoholConsumption', event.target.value)
                    }
                    placeholder="Álcool"
                  />
                  <Input
                    value={anamnesisForm.usesMedication}
                    onChange={(event) =>
                      handleAnamnesisChange('usesMedication', event.target.value)
                    }
                    placeholder="Uso de medicamentos"
                  />
                  <div className="md:col-span-2">
                    <Textarea
                      rows={3}
                      value={anamnesisForm.medicationList}
                      onChange={(event) =>
                        handleAnamnesisChange('medicationList', event.target.value)
                      }
                      placeholder="Lista de medicamentos"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Histórico de saúde</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    rows={3}
                    value={anamnesisForm.healthConditions}
                    onChange={(event) =>
                      handleAnamnesisChange('healthConditions', event.target.value)
                    }
                    placeholder="Condições de saúde"
                  />
                  <Textarea
                    rows={3}
                    value={anamnesisForm.familyHealthHistory}
                    onChange={(event) =>
                      handleAnamnesisChange('familyHealthHistory', event.target.value)
                    }
                    placeholder="Histórico familiar de doenças"
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Histórico psicológico</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={4}
                    value={anamnesisForm.psychologicalHistory}
                    onChange={(event) =>
                      handleAnamnesisChange('psychologicalHistory', event.target.value)
                    }
                    placeholder="Já fez terapia? Diagnósticos anteriores?"
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Motivo da avaliação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    rows={3}
                    value={anamnesisForm.evaluationReason}
                    onChange={(event) =>
                      handleAnamnesisChange('evaluationReason', event.target.value)
                    }
                    placeholder="Motivo principal"
                  />
                  <Textarea
                    rows={3}
                    value={anamnesisForm.mainComplaint}
                    onChange={(event) => handleAnamnesisChange('mainComplaint', event.target.value)}
                    placeholder="Queixa principal"
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Observações do profissional</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={7}
                    value={anamnesisForm.professionalNotes}
                    onChange={(event) =>
                      handleAnamnesisChange('professionalNotes', event.target.value)
                    }
                    placeholder="Campo livre para observações relevantes."
                  />
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
