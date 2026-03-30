import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { apiRequest, getApiBaseUrl, getApiToken, resolveApiRequestUrl } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { PERMISSIONS, hasPermission } from '@/modules/auth/access-control';
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

const DEFAULT_GIFT_MESSAGE =
  'Você recebeu uma avaliação DISC do InsightDISC. Aproveite para descobrir seu perfil comportamental completo.';

function buildGiftWhatsappShareLink(giftUrl) {
  const message = `Você recebeu um presente InsightDISC. Acesse seu teste por este link: ${giftUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function normalizeReportType(value = '', fallback = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'personal' || normalized === 'standard') return 'personal';
  if (normalized === 'professional') return 'professional';
  if (normalized === 'business' || normalized === 'premium') return 'business';
  return fallback ? normalizeReportType(fallback) : '';
}

const CHECKOUT_ITEM_LABELS = Object.freeze({
  personal: 'Plano Personal',
  professional: 'Plano Profissional',
  business: 'Plano Business',
  disc: 'DISC Individual',
  'business-monthly': 'Assinatura Business',
  single: '1 Avaliação Professional',
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
  const [searchParams] = useSearchParams();
  const { access: authAccess } = useAuth();
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
        if (!getApiToken()) {
          setPaymentConfirmed(false);
          setProcessingMessage('Faça login para visualizar o status final do pagamento.');
          setError('');
          setIsLoading(false);
          return;
        }

        try {
          const payload = await apiRequest(`/billing/checkout-session/${encodeURIComponent(sessionId)}/status`, {
            method: 'GET',
            requireAuth: true,
          });

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
  }, [searchParams, apiBaseUrl, requestedReportType]);

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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 space-y-5">
          {isLoading ? (
            <div className="flex items-center gap-3 text-slate-700">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando confirmação do pagamento...</span>
            </div>
          ) : error ? (
            <>
              <h1 className="text-xl font-bold text-slate-900">Não foi possível confirmar o pagamento</h1>
              <p className="text-sm text-slate-600">{error}</p>
              <div className="flex gap-3">
                <Link to={createPageUrl('Pricing')}>
                  <Button>Voltar para preços</Button>
                </Link>
              </div>
            </>
          ) : !paymentConfirmed ? (
            <>
              <div className="flex items-center gap-2 text-amber-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-semibold">Pagamento em processamento</span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900">Aguardando confirmação do Stripe</h1>

              <p className="text-sm text-slate-600">
                {processingMessage || 'Seu pagamento foi recebido e está em validação. Tente atualizar em alguns instantes.'}
              </p>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
                <p>
                  <strong>Plano/Produto:</strong> {checkoutItemLabel}
                </p>
                <p>
                  <strong>Status:</strong> Em processamento
                </p>
                <p>
                  Próximo passo: aguarde a confirmação do webhook. O acesso só é liberado no backend.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Atualizar status
                </Button>
                <Link to={createPageUrl('Pricing')}>
                  <Button>Voltar para preços</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Pagamento confirmado</span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                {isGiftFlow ? 'Presente DISC confirmado' : assessmentId ? 'Relatório liberado' : 'Acesso liberado'}
              </h1>

              <p className="text-sm text-slate-600">
                {isGiftFlow
                  ? 'Agora personalize o presente e gere o link exclusivo para compartilhar.'
                  : assessmentId
                    ? 'Seu acesso PRO foi liberado com sucesso.'
                    : 'Pagamento confirmado e benefícios aplicados com sucesso.'}
              </p>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-1">
                <p>
                  <strong>Obrigado pela sua compra.</strong>
                </p>
                <p>
                  <strong>Plano/Produto:</strong> {checkoutItemLabel}
                </p>
                <p>
                  <strong>Status:</strong> Confirmado
                </p>
                <p>
                  Próximos passos: acesse seu painel, acompanhe avaliações e consulte os relatórios liberados.
                </p>
              </div>

              {confirmedCredits > 0 ? (
                <p className="text-sm text-emerald-700">
                  {confirmedCredits} créditos adicionados. Saldo atual: {balanceAfterCheckout} créditos.
                </p>
              ) : null}

              {isGiftFlow ? (
                <>
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800">
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

                    <Button onClick={generateGiftLink} className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                      Gerar link do presente
                    </Button>
                  </div>

                  {giftLandingUrl ? (
                    <>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs break-all text-slate-600">
                        {giftLandingUrl}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <a href={giftLandingUrl} target="_blank" rel="noreferrer">
                          <Button className="bg-indigo-600 hover:bg-indigo-700">Abrir landing do presente</Button>
                        </a>
                        <Button variant="outline" onClick={copyGiftLinkToClipboard}>
                          {copiedGiftLink ? 'Link copiado' : 'Copiar link de presente'}
                        </Button>
                        <Button variant="outline" onClick={shareGiftOnWhatsapp}>
                          Compartilhar no WhatsApp
                        </Button>
                      </div>
                    </>
                  ) : null}

                  <Link to={createPageUrl('Pricing')}>
                    <Button variant="outline">Voltar para preços</Button>
                  </Link>
                </>
              ) : (
                <>
                  {showUpsell && upsellOffer ? (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                      <p className="text-xs uppercase tracking-[0.08em] font-semibold text-indigo-700">
                        Oferta especial pós-compra
                      </p>
                      <h3 className="text-lg font-bold text-indigo-950">{upsellOffer.title}</h3>
                      <p className="text-sm text-indigo-900">{upsellOffer.copy}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleUpsellAccept} className="bg-indigo-600 hover:bg-indigo-700">
                          {upsellOffer.ctaLabel}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleUpsellDismiss}>
                          Agora não
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {showDownsell && upsellOffer?.downsell ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                      <p className="text-xs uppercase tracking-[0.08em] font-semibold text-amber-700">
                        Oferta de recuperação
                      </p>
                      <h3 className="text-lg font-bold text-amber-950">{upsellOffer.downsell.title}</h3>
                      <p className="text-sm text-amber-900">{upsellOffer.downsell.copy}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleDownsellAccept} className="bg-amber-600 hover:bg-amber-700">
                          {upsellOffer.downsell.ctaLabel}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleDownsellDismiss}>
                          Fechar oferta
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <p className="text-xs text-slate-500">Clique em um dos botões abaixo para continuar.</p>
                  <div className="flex flex-wrap gap-3">
                    <Link to={openReportHref}>
                      <Button className="bg-indigo-600 hover:bg-indigo-700">
                        {assessmentId || candidateToken ? 'Abrir relatório' : 'Ir para painel'}
                      </Button>
                    </Link>
                    <Link to={createPageUrl('MyAssessments')}>
                      <Button variant="outline">Ver minhas avaliações</Button>
                    </Link>
                    {canOpenPdf ? (
                      <a href={availablePdfUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline">Abrir PDF</Button>
                      </a>
                    ) : null}
                    {publicToken ? (
                      <Link to={`/r/${encodeURIComponent(publicToken)}`}>
                        <Button variant="outline">Link público assinado</Button>
                      </Link>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    Dúvidas? Fale com o suporte InsightDISC para acompanhamento do seu pós-compra.
                  </p>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
