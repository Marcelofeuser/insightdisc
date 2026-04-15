import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { apiRequest, getApiBaseUrl, getApiToken, getApiUserEmail, resolveApiRequestUrl } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { PERMISSIONS, hasPermission } from '@/modules/auth/access-control';
import { sanitizeNextPath } from '@/modules/auth/next-path';
import { buildAssessmentReportPath } from '@/modules/reports';
import { trackEvent } from '@/lib/analytics';
import {
  hasCheckoutUpsellBeenDismissed,
  hasCheckoutUpsellBeenSeen,
  markCheckoutUpsellConverted,
  markCheckoutUpsellDismissed,
  markCheckoutUpsellSeen,
  resolveCheckoutUpsellOffer,
} from '@/modules/checkout/funnel';
import {
  buildGiftLink,
  markGiftOrderPaid,
  normalizeGiftPayload,
  resolveGiftPayload,
  saveGiftOrder,
} from '@/modules/billing/gift-utils';
import '@/styles/checkout-approved.css';

const CHECKOUT_INTENT_STORAGE_KEY = 'insightdisc_checkout_intent_v21';
const V21_WHITELABEL_REPORTS_ENABLED =
  String(import.meta.env.VITE_V21_WHITELABEL_REPORTS || '').trim().toLowerCase() === 'true';

const DEFAULT_GIFT_MESSAGE =
  'Você recebeu uma avaliação DISC do InsightDISC. Aproveite para descobrir seu perfil comportamental completo.';

function buildGiftWhatsappShareLink(giftUrl) {
  const message = `Você recebeu um presente InsightDISC. Acesse seu teste por este link: ${giftUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

const PLAN_PRICE_BY_KEY_BRL = Object.freeze({
  disc_individual: 59.9,
  single: 59.9,
  personal: 99.9,
  insider: 129.9,
  professional: 199.9,
  business: 399.9,
  business_corporation: 999.9,
  diamond_consulting: 9990,
});

function formatPriceBRL(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function readCheckoutIntent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function matchesCheckoutIntent(intentPlanKey = '', checkoutItemKey = '') {
  const normalizedIntent = String(intentPlanKey || '').trim().toLowerCase();
  const normalizedItem = String(checkoutItemKey || '').trim().toLowerCase();
  if (!normalizedIntent || !normalizedItem) return false;
  if (normalizedIntent === normalizedItem) return true;
  if (normalizedIntent === 'disc_individual' && normalizedItem === 'single') return true;
  if (normalizedIntent === 'diamond' && normalizedItem === 'diamond_consulting') return true;
  return false;
}

function isSubscriptionCheckoutItem(itemKey = '') {
  const normalized = String(itemKey || '').trim().toLowerCase();
  return [
    'personal',
    'insider',
    'professional',
    'business',
    'business_corporation',
    'diamond_consulting',
  ].includes(normalized);
}

function planIncludesWhiteLabel(itemKey = '') {
  const normalized = String(itemKey || '').trim().toLowerCase();
  return normalized === 'business_corporation' || normalized === 'diamond_consulting';
}

function normalizeReportType(value = '', fallback = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'personal' || normalized === 'standard') return 'personal';
  if (normalized === 'professional') return 'professional';
  if (normalized === 'business' || normalized === 'premium') return 'business';
  return fallback ? normalizeReportType(fallback) : '';
}

const CHECKOUT_ITEM_LABELS = Object.freeze({
  personal: 'Plano Personal — Uso contínuo individual',
  insider: 'Plano Insider — Mais recursos e profundidade',
  professional: 'Plano Professional — Aplicação profissional',
  business: 'Plano Business — Uso empresarial',
  business_corporation: 'Business Corporation',
  diamond_consulting: 'Diamond Consulting',
  diamond: 'Diamond',
  disc: 'DISC Individual — Relatório Completo',
  single: 'DISC Individual — Relatório Completo',
  'business-monthly': 'Assinatura Business',
  gift: 'Gift DISC',
  'pack-10': 'Pacote 10 avaliações',
  'pack-50': 'Pacote 50 avaliações',
  'pack-100': 'Pacote 100 avaliações',
  'report-unlock': 'Desbloqueio de relatório',
});

function resolveCheckoutItemLabel(searchParams) {
  const rawKey = String(
    searchParams.get('planId')
      || searchParams.get('product')
      || searchParams.get('item')
      || '',
  )
    .trim()
    .toLowerCase();
  if (!rawKey) return 'Compra InsightDISC';
  return CHECKOUT_ITEM_LABELS[rawKey] || rawKey;
}

function resolveCheckoutItemKey(searchParams) {
  return String(
    searchParams.get('planId')
      || searchParams.get('product')
      || searchParams.get('item')
      || '',
  )
    .trim()
    .toLowerCase();
}

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { access: authAccess, isAuthenticated, checkAppState } = useAuth();
  const checkoutCompletedTrackRef = useRef('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessmentId, setAssessmentId] = useState(searchParams.get('assessmentId') || '');
  const [candidateToken, setCandidateToken] = useState(searchParams.get('token') || '');
  const [flow, setFlow] = useState(searchParams.get('flow') || '');
  const [publicToken, setPublicToken] = useState('');
  const [availablePdfUrl, setAvailablePdfUrl] = useState(searchParams.get('pdfUrl') || '');
  const [confirmedCredits, setConfirmedCredits] = useState(0);
  const [balanceAfterCheckout, setBalanceAfterCheckout] = useState(0);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [checkoutIntent] = useState(() => readCheckoutIntent());

  const [giftPayload, setGiftPayload] = useState(null);
  const [giftLink, setGiftLink] = useState('');
  const [giftFormError, setGiftFormError] = useState('');
  const [copiedGiftLink, setCopiedGiftLink] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [showDownsell, setShowDownsell] = useState(false);
  const [giftForm, setGiftForm] = useState({
    senderName: '',
    senderEmail: '',
    recipientName: '',
    recipientEmail: '',
    message: '',
    useDefaultMessage: true,
  });

  const apiBaseUrl = getApiBaseUrl();
  const canExportReport = hasPermission(authAccess, PERMISSIONS.REPORT_EXPORT);

  const queryGiftToken = searchParams.get('giftToken') || '';
  const requestedReportType = normalizeReportType(
    searchParams.get('type') || searchParams.get('reportType') || '',
  );
  const isGiftFlow = flow === 'gift' || Boolean(queryGiftToken);
  const checkoutItemKey = useMemo(() => resolveCheckoutItemKey(searchParams), [searchParams]);
  const checkoutItemLabel = useMemo(() => resolveCheckoutItemLabel(searchParams), [searchParams]);
  const upsellOffer = useMemo(() => resolveCheckoutUpsellOffer(checkoutItemKey), [checkoutItemKey]);
  const sessionId = String(searchParams.get('session_id') || '').trim();
  const returnTo = useMemo(
    () => sanitizeNextPath(searchParams.get('returnTo'), ''),
    [searchParams],
  );
  const checkoutSummary = useMemo(() => {
    const subscription = isSubscriptionCheckoutItem(checkoutItemKey);
    const intentIsMatch = matchesCheckoutIntent(checkoutIntent?.planKey, checkoutItemKey);
    const safeIntent = intentIsMatch ? checkoutIntent : null;

    const planPriceBrl =
      safeIntent?.planPriceBrl ??
      (PLAN_PRICE_BY_KEY_BRL[checkoutItemKey] ?? null);
    const totalTodayBrl = safeIntent?.totalTodayBrl ?? null;
    const orderBump = Boolean(safeIntent?.orderBumpAdvancedAnalysis);
    const whiteLabelAddon = Boolean(safeIntent?.whiteLabelAddon);
    const whiteLabelIncluded = planIncludesWhiteLabel(checkoutItemKey);
    const whiteLabelActive =
      V21_WHITELABEL_REPORTS_ENABLED &&
      (whiteLabelAddon || whiteLabelIncluded);

    return {
      subscription,
      planPriceBrl,
      totalTodayBrl,
      orderBump,
      whiteLabelAddon,
      whiteLabelIncluded,
      whiteLabelActive,
    };
  }, [checkoutIntent, checkoutItemKey]);

  const giftLandingUrl = useMemo(() => {
    if (!queryGiftToken) return '';
    return (
      giftLink
      || buildGiftLink({
        token: queryGiftToken,
        payload: giftPayload || {},
      })
    );
  }, [queryGiftToken, giftLink, giftPayload]);

  useEffect(() => {
    const processCheckout = async () => {
      const sessionId = searchParams.get('session_id') || '';
      const fallbackAssessmentId = searchParams.get('assessmentId') || '';
      const fallbackToken = searchParams.get('token') || '';
      const fallbackFlow = searchParams.get('flow') || '';
      const fallbackEmail = searchParams.get('email') || '';
      const fallbackName = searchParams.get('name') || '';
      const fallbackGiftToken = searchParams.get('giftToken') || '';
      const isGiftContext = fallbackFlow === 'gift' || Boolean(fallbackGiftToken);
      const isMock = String(sessionId).startsWith('mock_');
      const isDev = import.meta.env.DEV;
      setPaymentConfirmed(false);
      setProcessingMessage('');

      const isCandidateContext =
        Boolean(fallbackAssessmentId)
        || Boolean(fallbackToken)
        || fallbackFlow === 'candidate'
        || Boolean(fallbackEmail);

      const resolvePdfFromToken = async (token, reportType = requestedReportType) => {
        if (!apiBaseUrl || !token) return '';
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);
          const query = new URLSearchParams({ token });
          const normalizedReportType = normalizeReportType(reportType);
          if (normalizedReportType) {
            query.set('type', normalizedReportType);
          }
          const endpoint = resolveApiRequestUrl(
            `/assessment/report-by-token?${query.toString()}`,
            { baseUrl: apiBaseUrl },
          );
          const response = await fetch(
            endpoint,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) return '';
          const rawPdfUrl = payload?.report?.pdfUrl || '';
          if (!rawPdfUrl) return '';
          return resolveApiRequestUrl(rawPdfUrl, { baseUrl: apiBaseUrl });
        } catch {
          return '';
        }
      };

      if (fallbackGiftToken) {
        const giftData = resolveGiftPayload({ token: fallbackGiftToken, searchParams });
        const initialPayload = giftData.payload || {};

        setGiftPayload(initialPayload);
        setGiftLink(
          buildGiftLink({
            token: fallbackGiftToken,
            payload: initialPayload,
          })
        );

        setGiftForm((prev) => ({
          ...prev,
          senderName: initialPayload.senderName || '',
          senderEmail: initialPayload.senderEmail || '',
          recipientName: initialPayload.recipientName || '',
          recipientEmail: initialPayload.recipientEmail || '',
          message: initialPayload.message || '',
          useDefaultMessage: !initialPayload.message,
        }));
      }

      setCandidateToken(fallbackToken);
      setFlow(
        fallbackFlow
          || (isGiftContext ? 'gift' : '')
          || (fallbackToken || fallbackEmail || fallbackName ? 'candidate' : '')
      );

      if (searchParams.get('pdfUrl')) {
        setAvailablePdfUrl(searchParams.get('pdfUrl') || '');
      } else if (fallbackToken && !isMock) {
        const pdfByToken = await resolvePdfFromToken(fallbackToken, requestedReportType);
        if (pdfByToken) setAvailablePdfUrl(pdfByToken);
      }

      if ((isMock || isDev) && fallbackAssessmentId) {
        setAssessmentId(fallbackAssessmentId);
        setPublicToken('');
        setPaymentConfirmed(true);
        try {
          await base44.entities.Assessment.update(fallbackAssessmentId, {
            report_unlocked: true,
            unlocked_tier: 'pro',
            unlocked_at: new Date().toISOString(),
            public_share_token: `mock:${fallbackAssessmentId}`,
          });
        } catch {
          // fallback local
        } finally {
          if (isGiftContext && fallbackGiftToken && sessionId) {
            markGiftOrderPaid(fallbackGiftToken, sessionId);
          }
          setError('');
          setIsLoading(false);
        }
        return;
      }

      if (!sessionId) {
        setError('Sessão de pagamento não encontrada.');
        setIsLoading(false);
        return;
      }

      if (apiBaseUrl && !isCandidateContext) {
        const hasApiAuthHeaders =
          Boolean(getApiToken()) || (import.meta.env.DEV && Boolean(getApiUserEmail()));
        if (!hasApiAuthHeaders) {
          setPaymentConfirmed(false);
          setProcessingMessage('Faça login para visualizar o status final do pagamento.');
          setError('');
          setIsLoading(false);
          return;
        }

        try {
          let payload = await apiRequest(`/billing/checkout-session/${encodeURIComponent(sessionId)}/status`, {
            method: 'GET',
            requireAuth: true,
          });

          if (payload?.found === false) {
            try {
              payload = await apiRequest('/payments/claim-checkout', {
                method: 'POST',
                requireAuth: true,
                body: { sessionId },
              });
            } catch {
              // ignore claim errors and fall back to original status response
            }
          }

          const status = String(payload?.status || '').toLowerCase();

          if (status === 'paid') {
            setPaymentConfirmed(true);
            setConfirmedCredits(Number(payload?.creditsAdded || 0));
            setBalanceAfterCheckout(Number(payload?.balance || 0));
            if (isGiftContext && fallbackGiftToken) {
              markGiftOrderPaid(fallbackGiftToken, sessionId);
            }
            setError('');
            setIsLoading(false);
            return;
          }

          if (status === 'pending') {
            setPaymentConfirmed(false);
            setProcessingMessage(
              'Pagamento em processamento. Assim que o Stripe confirmar, os créditos/plano serão liberados automaticamente.',
            );
            setError('');
            setIsLoading(false);
            return;
          }

          setPaymentConfirmed(false);
          setError(payload?.message || 'Pagamento não confirmado.');
          setIsLoading(false);
          return;
        } catch (statusError) {
          setPaymentConfirmed(false);
          setError(statusError?.message || 'Não foi possível consultar o status do pagamento.');
          setIsLoading(false);
          return;
        }
      }

      if (!isCandidateContext) {
        setPaymentConfirmed(false);
        setProcessingMessage('Pagamento em processamento. Recarregue esta página em instantes.');
        setError('');
        setIsLoading(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const response = await fetch('/api/stripe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            assessmentId: fallbackAssessmentId || undefined,
            token: fallbackToken || undefined,
            flow: fallbackFlow || undefined,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || 'Não foi possível confirmar seu pagamento.');
        }

        const resolvedAssessmentId = data.assessmentId || fallbackAssessmentId || '';
        setAssessmentId(resolvedAssessmentId);
        setPublicToken(data.publicToken || '');
        setPaymentConfirmed(Boolean(data?.ok));
        setCandidateToken(data.token || fallbackToken || '');
        setFlow(
          data.flow
            || fallbackFlow
            || (isGiftContext ? 'gift' : '')
            || (data.token || fallbackToken ? 'candidate' : '')
        );

        const pdfByToken = await resolvePdfFromToken(
          data.token || fallbackToken || '',
          requestedReportType,
        );
        if (pdfByToken) setAvailablePdfUrl(pdfByToken);

        if (isGiftContext && fallbackGiftToken) {
          markGiftOrderPaid(fallbackGiftToken, sessionId);
        }

        if (resolvedAssessmentId && base44?.__isMock) {
          await base44.entities.Assessment.update(resolvedAssessmentId, {
            report_unlocked: true,
            unlocked_tier: 'pro',
            unlocked_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        if (isMock && fallbackAssessmentId) {
          try {
            if (base44?.__isMock) {
              await base44.entities.Assessment.update(fallbackAssessmentId, {
                report_unlocked: true,
                unlocked_tier: 'pro',
                unlocked_at: new Date().toISOString(),
                public_share_token: `mock:${fallbackAssessmentId}`,
              });
            }
            setPublicToken('');
            setAssessmentId(fallbackAssessmentId);
            setPaymentConfirmed(true);
            setCandidateToken(fallbackToken || '');
            setFlow(
              fallbackFlow
                || (isGiftContext ? 'gift' : '')
                || (fallbackToken ? 'candidate' : '')
            );
            setError('');
          } catch {
            setAssessmentId(fallbackAssessmentId);
            setPublicToken('');
            setPaymentConfirmed(true);
            setCandidateToken(fallbackToken || '');
            setFlow(
              fallbackFlow
                || (isGiftContext ? 'gift' : '')
                || (fallbackToken ? 'candidate' : '')
            );
            setError('');
          } finally {
            setIsLoading(false);
          }
          return;
        }

        setError(err?.message || 'Falha na confirmação do pagamento.');
      } finally {
        setIsLoading(false);
      }
    };

    processCheckout();
  }, [searchParams, apiBaseUrl, requestedReportType, isAuthenticated]);

  useEffect(() => {
    if (!paymentConfirmed || !returnTo || isGiftFlow) return undefined;

    const timer = window.setTimeout(() => {
      const goToReturnPath = async () => {
        if (returnTo.startsWith('/chat/')) {
          try {
            await checkAppState();
          } catch {
            // ignore refresh errors and let the route decide the next step
          }
        }
        navigate(returnTo, { replace: true });
      };

      void goToReturnPath();
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [checkAppState, isGiftFlow, navigate, paymentConfirmed, returnTo]);

  const openReportHref = (() => {
    const isCandidateFlow = flow === 'candidate' || Boolean(candidateToken);

    if (isCandidateFlow && candidateToken) {
      const qs = new URLSearchParams();
      if (candidateToken) qs.set('token', candidateToken);
      if (assessmentId) qs.set('assessmentId', assessmentId);
      if (requestedReportType) qs.set('type', requestedReportType);
      return `/c/upgrade?${qs.toString()}`;
    }

    if (assessmentId) {
      return buildAssessmentReportPath(assessmentId);
    }

    return createPageUrl('Dashboard');
  })();

  const canOpenPdf = Boolean(availablePdfUrl) && Boolean(canExportReport);

  const setGiftField = (field, value) => {
    setGiftForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generateGiftLink = () => {
    if (!queryGiftToken) {
      setGiftFormError('Token do presente não encontrado.');
      return;
    }

    const payload = normalizeGiftPayload({
      senderName: giftForm.senderName,
      senderEmail: giftForm.senderEmail,
      recipientName: giftForm.recipientName,
      recipientEmail: giftForm.recipientEmail,
      message: giftForm.useDefaultMessage ? DEFAULT_GIFT_MESSAGE : giftForm.message,
    });

    if (!payload.senderName) {
      setGiftFormError('Informe o nome de quem está enviando o presente.');
      return;
    }

    if (!payload.recipientName) {
      setGiftFormError('Informe o nome de quem vai receber o presente.');
      return;
    }

    saveGiftOrder({
      token: queryGiftToken,
      payload,
      status: 'paid',
      sessionId: searchParams.get('session_id') || '',
    });

    const nextGiftLink = buildGiftLink({
      token: queryGiftToken,
      payload,
    });

    setGiftPayload(payload);
    setGiftLink(nextGiftLink);
    setGiftFormError('');
    setCopiedGiftLink(false);
  };

  const copyGiftLinkToClipboard = async () => {
    if (!giftLandingUrl) return;
    try {
      await navigator.clipboard.writeText(giftLandingUrl);
      setCopiedGiftLink(true);
      setTimeout(() => setCopiedGiftLink(false), 2200);
    } catch {
      setCopiedGiftLink(false);
    }
  };

  const shareGiftOnWhatsapp = () => {
    if (!giftLandingUrl) return;
    const url = buildGiftWhatsappShareLink(giftLandingUrl);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (!paymentConfirmed) return;

    const trackKey = `${sessionId || 'no_session'}:${checkoutItemKey || 'unknown'}`;
    if (checkoutCompletedTrackRef.current === trackKey) return;
    checkoutCompletedTrackRef.current = trackKey;

    trackEvent('checkout_completed', {
      sessionId,
      item: checkoutItemKey || checkoutItemLabel,
      flow: isGiftFlow ? 'gift' : 'default',
    });
  }, [checkoutItemKey, checkoutItemLabel, isGiftFlow, paymentConfirmed, sessionId]);

  useEffect(() => {
    if (!paymentConfirmed || isGiftFlow || !upsellOffer?.key) {
      setShowUpsell(false);
      setShowDownsell(false);
      return;
    }

    const alreadySeen = hasCheckoutUpsellBeenSeen(upsellOffer.key);
    const alreadyDismissed = hasCheckoutUpsellBeenDismissed(upsellOffer.key);
    if (alreadySeen || alreadyDismissed) {
      setShowUpsell(false);
      return;
    }

    markCheckoutUpsellSeen(upsellOffer.key);
    trackEvent('upsell_viewed', {
      offerKey: upsellOffer.key,
      sourceItem: checkoutItemKey,
      sessionId,
    });
    setShowUpsell(true);
    setShowDownsell(false);
  }, [checkoutItemKey, isGiftFlow, paymentConfirmed, sessionId, upsellOffer]);

  const handleUpsellAccept = () => {
    if (!upsellOffer?.key) return;
    markCheckoutUpsellConverted(upsellOffer.key);
    trackEvent('upsell_converted', {
      offerKey: upsellOffer.key,
      sourceItem: checkoutItemKey,
      sessionId,
    });
    window.location.assign(upsellOffer.ctaPath);
  };

  const handleUpsellDismiss = () => {
    if (!upsellOffer?.key) return;
    markCheckoutUpsellDismissed(upsellOffer.key);
    setShowUpsell(false);

    if (upsellOffer.downsell?.key && !hasCheckoutUpsellBeenDismissed(upsellOffer.downsell.key)) {
      setShowDownsell(true);
    }
  };

  const handleDownsellAccept = () => {
    if (!upsellOffer?.downsell?.key) return;
    markCheckoutUpsellConverted(upsellOffer.downsell.key);
    trackEvent('downsell_converted', {
      offerKey: upsellOffer.downsell.key,
      sourceItem: checkoutItemKey,
      sessionId,
    });
    window.location.assign(upsellOffer.downsell.ctaPath);
  };

  const handleDownsellDismiss = () => {
    if (!upsellOffer?.downsell?.key) return;
    markCheckoutUpsellDismissed(upsellOffer.downsell.key);
    setShowDownsell(false);
  };

  const upsellPrice = (() => {
    const baseKey = upsellOffer?.key || '';
    if (baseKey.includes('diamond')) {
      const from = PLAN_PRICE_BY_KEY_BRL.diamond_consulting;
      return { from: from != null ? formatPriceBRL(from) : '—', to: 'Condição no checkout' };
    }
    if (baseKey.includes('business')) {
      const from = PLAN_PRICE_BY_KEY_BRL.business;
      return { from: from != null ? formatPriceBRL(from) : '—', to: 'Condição no checkout' };
    }
    return showDownsell
      ? { from: '—', to: 'Condição no checkout' }
      : { from: '—', to: 'Condição no checkout' };
  })();

  return (
    <div className="checkout-approved-page">
      <div className="container success-wrap">
        <div className="success-card">
          {isLoading ? (
            <div className="success-header">
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div className="success-bubble">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <div className="badge success">Processando</div>
                  <h1 style={{ margin: '10px 0 8px', color: '#0f172a' }}>Confirmando seu pagamento</h1>
                  <p className="subcopy" style={{ margin: 0 }}>
                    Estamos consultando o Stripe e validando o webhook para liberar seu acesso com segurança.
                  </p>
                </div>
              </div>
            </div>
          ) : error ? (
            <>
              <div className="success-header">
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className="success-bubble" style={{ background: 'rgba(220,38,38,.14)', color: '#dc2626' }}>!</div>
                  <div>
                    <div className="badge" style={{ background: 'rgba(220,38,38,.12)', color: '#dc2626' }}>Falha na confirmação</div>
                    <h1 style={{ margin: '10px 0 8px', color: '#0f172a' }}>Não foi possível confirmar o pagamento</h1>
                    <p className="subcopy" style={{ margin: 0 }}>{error}</p>
                  </div>
                </div>
              </div>
              <div className="cta-row">
                <Link to={createPageUrl('Pricing')} className="btn secondary" style={{ width: 'auto', padding: '14px 22px' }}>
                  Voltar para preços
                </Link>
              </div>
            </>
          ) : !paymentConfirmed ? (
            <>
              <div className="success-header">
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className="success-bubble" style={{ background: 'rgba(245,158,11,.14)', color: '#f59e0b' }}>
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <div>
                    <div className="badge" style={{ background: 'rgba(245,158,11,.12)', color: '#b45309' }}>
                      Pagamento em processamento
                    </div>
                    <h1 style={{ margin: '10px 0 8px', color: '#0f172a' }}>Aguardando confirmação do Stripe</h1>
                    <p className="subcopy" style={{ margin: 0 }}>
                      {processingMessage || 'Seu pagamento foi recebido e está em validação. Tente atualizar em alguns instantes.'}
                    </p>
                  </div>
                </div>
                <div className="panel checkout-inline-panel">
                  <div className="label">Plano contratado</div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{checkoutItemLabel}</div>
                  <div className="fine" style={{ marginTop: 8 }}>
                    {checkoutSummary.subscription ? 'Tipo: Assinatura mensal' : 'Tipo: Pagamento único'}
                    {checkoutSummary.subscription && checkoutSummary.planPriceBrl != null
                      ? ` • Próxima cobrança: ${formatPriceBRL(checkoutSummary.planPriceBrl)}/mês`
                      : ''}
                  </div>
                  {checkoutSummary.whiteLabelActive ? (
                    <div className="fine" style={{ marginTop: 6 }}>
                      {checkoutSummary.whiteLabelAddon
                        ? 'White Label: Ativado • Cobrança única: R$ 299,00.'
                        : '✔ White Label já incluso no plano.'}
                    </div>
                  ) : null}
                  <div className="fine" style={{ marginTop: 8 }}>Status: Em processamento</div>
                </div>
              </div>
              <div className="mini-grid">
                <div className="mini-card">
                  <strong>Status do pagamento</strong>
                  <div className="fine" style={{ marginTop: 8 }}>Em processamento</div>
                </div>
                <div className="mini-card">
                  <strong>Próximo passo</strong>
                  <div className="fine" style={{ marginTop: 8 }}>Aguarde o webhook confirmar no backend.</div>
                </div>
                <div className="mini-card">
                  <strong>Segurança</strong>
                  <div className="fine" style={{ marginTop: 8 }}>Acesso só é liberado após confirmação real.</div>
                </div>
              </div>
              <div className="cta-row">
                <button className="btn secondary" style={{ width: 'auto', padding: '14px 22px' }} onClick={() => window.location.reload()}>
                  Atualizar status
                </button>
                <Link to={createPageUrl('Pricing')} className="btn secondary" style={{ width: 'auto', padding: '14px 22px' }}>
                  Voltar para preços
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="success-header">
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className="success-bubble">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="badge success">Pagamento recebido</div>
                    <h1 style={{ margin: '10px 0 8px', color: '#0f172a' }}>
                      {isGiftFlow ? 'Presente DISC confirmado' : 'Compra confirmada com sucesso'}
                    </h1>
                    <p className="subcopy" style={{ margin: 0 }}>
                      {isGiftFlow
                        ? 'Agora personalize o presente e gere o link exclusivo para compartilhar.'
                        : 'A ativação final depende da confirmação do webhook Stripe. Se o pagamento foi por Pix, ele pode aparecer primeiro como processamento.'}
                    </p>
                  </div>
                </div>
                <div className="panel checkout-inline-panel">
                  <div className="label">Plano contratado</div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{checkoutItemLabel}</div>
                  <div className="fine" style={{ marginTop: 8 }}>
                    {checkoutSummary.subscription ? 'Tipo: Assinatura mensal' : 'Tipo: Pagamento único'}
                    {checkoutSummary.totalTodayBrl != null ? ` • Valor pago hoje: ${formatPriceBRL(checkoutSummary.totalTodayBrl)}` : ''}
                  </div>
                  {checkoutSummary.subscription && checkoutSummary.planPriceBrl != null ? (
                    <div className="fine" style={{ marginTop: 6 }}>
                      Próxima cobrança: {formatPriceBRL(checkoutSummary.planPriceBrl)}/mês.
                    </div>
                  ) : null}
                  {checkoutItemKey === 'business_corporation' ? (
                    <div className="fine" style={{ marginTop: 6 }}>
                      Uso ilimitado (uso justo).
                    </div>
                  ) : null}
                  {checkoutSummary.whiteLabelActive ? (
                    <div className="fine" style={{ marginTop: 6 }}>
                      {checkoutSummary.whiteLabelAddon
                        ? 'White Label: Ativado • Cobrança única: R$ 299,00.'
                        : '✔ White Label já incluso no plano.'}
                    </div>
                  ) : null}
                  <div className="fine" style={{ marginTop: 8 }}>
                    {confirmedCredits > 0
                      ? `${confirmedCredits} créditos adicionados. Saldo atual: ${balanceAfterCheckout}.`
                      : 'Pagamento confirmado e benefícios aplicados.'}
                  </div>
                </div>
              </div>

              <div className="cta-row">
                {returnTo ? (
                  <Link to={returnTo} className="btn primary" style={{ width: 'auto', padding: '14px 22px' }}>
                    Continuar na Synapsys
                  </Link>
                ) : null}
                <Link to={openReportHref} className="btn primary" style={{ width: 'auto', padding: '14px 22px' }}>
                  {assessmentId || candidateToken ? 'Ir para meu relatório' : 'Ir para meu painel'}
                </Link>
                {!assessmentId && !candidateToken ? (
                  <Link to="/PremiumAssessment" className="btn secondary" style={{ width: 'auto', padding: '14px 22px' }}>
                    Iniciar avaliação
                  </Link>
                ) : null}
                <Link to={createPageUrl('MyAssessments')} className="btn secondary" style={{ width: 'auto', padding: '14px 22px' }}>
                  Ver minhas avaliações
                </Link>
                {checkoutSummary.whiteLabelActive ? (
                  <Link to="/app/branding" className="btn secondary" style={{ width: 'auto', padding: '14px 22px' }}>
                    Configurar marca
                  </Link>
                ) : null}
                {canOpenPdf ? (
                  <a href={availablePdfUrl} target="_blank" rel="noreferrer" className="btn secondary" style={{ width: 'auto', padding: '14px 22px' }}>
                    Abrir PDF
                  </a>
                ) : null}
                {publicToken ? (
                  <Link to={`/r/${encodeURIComponent(publicToken)}`} className="btn secondary" style={{ width: 'auto', padding: '14px 22px' }}>
                    Link público assinado
                  </Link>
                ) : null}
              </div>

              <div className="mini-grid">
                <div className="mini-card">
                  <strong>Status do pagamento</strong>
                  <div className="fine" style={{ marginTop: 8 }}>Confirmado</div>
                </div>
                <div className="mini-card">
                  <strong>Próximo passo</strong>
                  <div className="fine" style={{ marginTop: 8 }}>
                    {returnTo
                      ? 'Abrir o destino configurado e continuar a experiência da Synapsys.'
                      : 'Entrar no painel e continuar de onde parou.'}
                  </div>
                </div>
                <div className="mini-card">
                  <strong>Suporte</strong>
                  <div className="fine" style={{ marginTop: 8 }}>Se demorar, atualize a página em alguns instantes.</div>
                </div>
              </div>

              {isGiftFlow ? (
                <>
                  <div className="mini-card" style={{ marginTop: 22 }}>
                    Personalização pós-compra: informe os nomes e, opcionalmente, ajuste mensagem e e-mails.
                  </div>

                  <div className="grid gap-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        value={giftForm.senderName}
                        onChange={(event) => setGiftField('senderName', event.target.value)}
                        placeholder="Nome de quem envia *"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm"
                      />
                      <input
                        value={giftForm.recipientName}
                        onChange={(event) => setGiftField('recipientName', event.target.value)}
                        placeholder="Nome de quem recebe *"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        value={giftForm.senderEmail}
                        onChange={(event) => setGiftField('senderEmail', event.target.value)}
                        placeholder="E-mail de quem envia (opcional)"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm"
                      />
                      <input
                        value={giftForm.recipientEmail}
                        onChange={(event) => setGiftField('recipientEmail', event.target.value)}
                        placeholder="E-mail de quem recebe (opcional)"
                        className="h-11 rounded-xl border border-slate-300 px-3 text-sm"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={giftForm.useDefaultMessage}
                        onChange={(event) => setGiftField('useDefaultMessage', event.target.checked)}
                      />
                      Usar mensagem pronta do InsightDISC
                    </label>

                    <textarea
                      value={giftForm.useDefaultMessage ? DEFAULT_GIFT_MESSAGE : giftForm.message}
                      onChange={(event) => setGiftField('message', event.target.value)}
                      disabled={giftForm.useDefaultMessage}
                      placeholder="Mensagem personalizada (opcional)"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-24"
                    />

                    {giftFormError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{giftFormError}</div>
                    ) : null}

                    <button onClick={generateGiftLink} className="btn primary">
                      Gerar link do presente
                    </button>
                  </div>

                  {giftLandingUrl ? (
                    <>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs break-all text-slate-600">
                        {giftLandingUrl}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <a href={giftLandingUrl} target="_blank" rel="noreferrer">
                          <span className="btn primary" style={{ width: 'auto', padding: '12px 18px' }}>Abrir landing do presente</span>
                        </a>
                        <button className="btn secondary" style={{ width: 'auto', padding: '12px 18px' }} onClick={copyGiftLinkToClipboard}>
                          {copiedGiftLink ? 'Link copiado' : 'Copiar link de presente'}
                        </button>
                        <button className="btn secondary" style={{ width: 'auto', padding: '12px 18px' }} onClick={shareGiftOnWhatsapp}>
                          Compartilhar no WhatsApp
                        </button>
                      </div>
                    </>
                  ) : null}

                  <Link to={createPageUrl('Pricing')} className="btn secondary" style={{ width: 'auto', padding: '12px 18px', marginTop: 12 }}>
                    Voltar para preços
                  </Link>
                </>
              ) : (
                <>
                  {(showUpsell && upsellOffer) || (showDownsell && upsellOffer?.downsell) ? (
                    <div className="upsell">
                      <div className="upsell-grid">
                        <div>
                          <div className="badge light">
                            {showDownsell ? 'Oferta de recuperação' : 'Oferta exclusiva liberada'}
                          </div>
                          <h2 style={{ fontSize: 34, margin: '14px 0 10px' }}>
                            {showDownsell ? upsellOffer.downsell.title : upsellOffer.title}
                          </h2>
                          <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7 }}>
                            {showDownsell ? upsellOffer.downsell.copy : upsellOffer.copy}
                          </p>
                          <ul className="feature-list" style={{ marginTop: 18 }}>
                            <li className="feature-item">
                              <span className="check">✓</span>
                              <div>
                                <strong>Team Map</strong>
                                <div className="fine">Mapa comportamental consolidado para equipes.</div>
                              </div>
                            </li>
                            <li className="feature-item">
                              <span className="check">✓</span>
                              <div>
                                <strong>Visão de liderança</strong>
                                <div className="fine">Mais contexto para decisões de gestão e RH.</div>
                              </div>
                            </li>
                            <li className="feature-item">
                              <span className="check">✓</span>
                              <div>
                                <strong>Escala operacional</strong>
                                <div className="fine">Mais avaliações e mais profundidade para uso empresarial.</div>
                              </div>
                            </li>
                          </ul>
                        </div>
                        <div className="panel" style={{ borderRadius: 28 }}>
                          <div className="label">Hoje apenas</div>
                          <div style={{ marginTop: 14 }} className="strike">{upsellPrice.from}</div>
                          <div className="highlight-price">{upsellPrice.to}</div>
                          <div className="fine" style={{ marginTop: 8 }}>Upgrade imediato com condição de ativação.</div>
                          <div className="cta-row" style={{ marginTop: 18 }}>
                            {showDownsell ? (
                              <>
                                <button className="btn primary" onClick={handleDownsellAccept}>
                                  {upsellOffer.downsell.ctaLabel}
                                </button>
                                <button className="btn secondary" onClick={handleDownsellDismiss}>
                                  Continuar com meu plano atual
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="btn primary" onClick={handleUpsellAccept}>
                                  {upsellOffer.ctaLabel}
                                </button>
                                <button className="btn secondary" onClick={handleUpsellDismiss}>
                                  Continuar com meu plano atual
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
