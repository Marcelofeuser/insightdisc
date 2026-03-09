import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import insightChatbotFlow from '@/modules/chatbot/insightChatbotFlow';
import { getApiBaseUrl } from '@/lib/apiClient';

const LEADS_STORAGE_KEY = 'insightdisc_chatbot_leads';

function isBrowser() {
  return typeof window !== 'undefined';
}

function getNowIso() {
  return new Date().toISOString();
}

function makeMessage(role, text, nodeId = '') {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text: String(text || ''),
    nodeId: nodeId || '',
    createdAt: getNowIso(),
  };
}

function getNodeMessage(node = {}) {
  if (node.type === 'message') return String(node.message || '').trim();
  if (node.type === 'lead_form') return String(node.title || 'Preencha seus dados').trim();
  return '';
}

function loadJson(storageKey, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(storageKey, value) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore quota/storage errors
  }
}

function getInitialSession(config) {
  const startNodeId = config.settings.startNode || 'welcome';
  const startNode = config.nodes[startNodeId] || {};
  const firstText = getNodeMessage(startNode);

  return {
    isOpen: false,
    currentNodeId: startNodeId,
    history: firstText ? [makeMessage('bot', firstText, startNodeId)] : [],
    formValuesByNode: {},
  };
}

export function useInsightChatbot() {
  const navigate = useNavigate();
  const config = useMemo(() => insightChatbotFlow.chatbot, []);
  const storageKey = config.settings.storageKey || 'insightdisc_chatbot_session';
  const apiBaseUrl = getApiBaseUrl();

  const [session, setSession] = useState(() => {
    const base = getInitialSession(config);
    const persisted = loadJson(storageKey, null);
    if (!persisted || typeof persisted !== 'object') return base;
    return {
      ...base,
      ...persisted,
      history: Array.isArray(persisted.history) ? persisted.history : base.history,
      formValuesByNode:
        persisted.formValuesByNode && typeof persisted.formValuesByNode === 'object'
          ? persisted.formValuesByNode
          : {},
    };
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [submissionNotice, setSubmissionNotice] = useState(null);

  const currentNode = config.nodes[session.currentNodeId] || config.nodes[config.settings.startNode];
  const currentFormValues = session.formValuesByNode[session.currentNodeId] || {};

  useEffect(() => {
    saveJson(storageKey, session);
  }, [storageKey, session]);

  const openChat = () => {
    setSession((prev) => ({ ...prev, isOpen: true }));
  };

  const closeChat = () => {
    setSession((prev) => ({ ...prev, isOpen: false }));
  };

  const toggleChat = () => {
    setSession((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  };

  const goToNode = (nodeId) => {
    const nextNode = config.nodes[nodeId];
    if (!nextNode) return;

    const botText = getNodeMessage(nextNode);
    setSession((prev) => ({
      ...prev,
      currentNodeId: nodeId,
      history: botText
        ? [...prev.history, makeMessage('bot', botText, nodeId)]
        : [...prev.history],
    }));
    setFieldErrors({});
  };

  const resetConversation = () => {
    const initial = getInitialSession(config);
    setSession((prev) => ({
      ...initial,
      isOpen: prev.isOpen,
    }));
    setFieldErrors({});
    setSubmissionNotice(null);
  };

  const handleAction = (option) => {
    if (!option?.action) return;
    if (option.action === 'navigate' && option.to) {
      navigate(option.to);
      return;
    }
    if (option.action === 'whatsapp') {
      if (isBrowser()) {
        window.open(config.settings.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const selectOption = (option) => {
    if (!option) return;

    setSession((prev) => ({
      ...prev,
      history: [...prev.history, makeMessage('user', option.label, prev.currentNodeId)],
    }));

    if (option.action) {
      handleAction(option);
    }

    if (option.next) {
      goToNode(option.next);
    }
  };

  const updateFormValue = (fieldName, value) => {
    setSession((prev) => ({
      ...prev,
      formValuesByNode: {
        ...prev.formValuesByNode,
        [prev.currentNodeId]: {
          ...(prev.formValuesByNode[prev.currentNodeId] || {}),
          [fieldName]: value,
        },
      },
    }));

    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      return { ...prev, [fieldName]: '' };
    });
  };

  const validateLeadForm = () => {
    const node = currentNode;
    if (node?.type !== 'lead_form') return true;
    const nextErrors = {};

    for (const field of node.fields || []) {
      const value = String(currentFormValues[field.name] || '').trim();
      if (field.required && !value) {
        nextErrors[field.name] = 'Campo obrigatório';
        continue;
      }

      if (field.type === 'email' && value) {
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (!isValidEmail) {
          nextErrors[field.name] = 'E-mail inválido';
        }
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitLeadForm = async () => {
    const node = currentNode;
    if (node?.type !== 'lead_form') return;
    if (!validateLeadForm()) return;

    const payload = {};
    for (const field of node.fields || []) {
      payload[field.name] = String(currentFormValues[field.name] || '').trim();
    }

    const leadRecord = {
      source: 'chatbot',
      name: payload.name || '',
      email: payload.email || '',
      phone: payload.phone || '',
      company: payload.company || '',
      interest: payload.interest || payload.goal || '',
      message: payload.message || payload.goal || '',
      page: isBrowser() ? window.location.pathname : '',
      tags: payload.teamSize ? [`team:${payload.teamSize}`] : [],
    };

    let sentToApi = false;
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadRecord),
        });
        sentToApi = response.ok;
      } catch {
        sentToApi = false;
      }
    }

    const leads = loadJson(LEADS_STORAGE_KEY, []);
    const nextLeads = Array.isArray(leads) ? leads : [];
    nextLeads.push({
      createdAt: getNowIso(),
      source: 'chatbot',
      payload: leadRecord,
      syncedToApi: sentToApi,
    });
    saveJson(LEADS_STORAGE_KEY, nextLeads);

    setSession((prev) => ({
      ...prev,
      history: [
        ...prev.history,
        makeMessage('user', 'Dados enviados com sucesso.', prev.currentNodeId),
      ],
    }));

    setSubmissionNotice({
      type: 'success',
      message: sentToApi
        ? 'Recebemos seus dados. Nosso time comercial entrará em contato.'
        : 'Recebemos seus dados localmente e vamos sincronizar quando a API estiver disponível.',
      sentToApi,
      at: Date.now(),
    });

    if (node.onSubmitNext) {
      goToNode(node.onSubmitNext);
    }
  };

  return {
    config,
    currentNode,
    currentFormValues,
    fieldErrors,
    history: session.history,
    isOpen: session.isOpen,
    openChat,
    closeChat,
    toggleChat,
    selectOption,
    updateFormValue,
    submitLeadForm,
    resetConversation,
    submissionNotice,
    clearSubmissionNotice: () => setSubmissionNotice(null),
  };
}

export default useInsightChatbot;
