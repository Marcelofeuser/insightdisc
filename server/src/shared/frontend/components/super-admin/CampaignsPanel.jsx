import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  History,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  UserRoundPlus,
} from 'lucide-react';
import { apiRequest, getApiAuthHeaders, getApiBaseUrl, resolveApiRequestUrl } from '@/lib/apiClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_SUMMARY = Object.freeze({
  campaignsActive: 0,
  campaignsScheduled: 0,
  campaignsExpired: 0,
  campaignsPaused: 0,
  campaignsExhausted: 0,
  couponsAvailable: 0,
  couponsRedeemed: 0,
  couponsDisabled: 0,
  promoAccountsGenerated: 0,
  creditsDistributed: 0,
});

const DEFAULT_FORM = Object.freeze({
  name: '',
  slug: '',
  description: '',
  mode: 'COUPON',
  creditsAmount: '10',
  quantityPlanned: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
  allowMultipleRedemptionsPerUser: false,
  maxRedemptionsPerUser: '1',
});

const DEFAULT_COUPON_FORM = Object.freeze({
  quantity: '10',
  prefix: '',
  allowOverflow: false,
});

const DEFAULT_PROMO_FORM = Object.freeze({
  quantity: '10',
  emailPrefix: '',
  emailDomain: 'insightdisc.app',
  allowOverflow: false,
  userRole: 'PRO',
});

function buildDirectBackendRequestOptions(baseUrl = '') {
  const normalized = String(baseUrl || '').trim();
  return normalized ? { baseUrl: normalized, runtimeOrigin: normalized } : {};
}

function isOpaqueUiErrorMessage(message = '') {
  const normalized = String(message || '').trim();
  if (!normalized) return true;
  return /^HTTP_\d+$/i.test(normalized) || /^[A-Z0-9_:-]+$/.test(normalized);
}

function normalizeSuperAdminUiError(error, fallback = 'Não foi possível concluir esta ação.') {
  const rawMessage = String(error?.payload?.message || error?.message || '')
    .replace(/\s+/g, ' ')
    .trim();
  const code = String(error?.code || error?.payload?.error || error?.payload?.reason || rawMessage)
    .trim()
    .toUpperCase();

  if (!rawMessage) return fallback;
  if (code.includes('NOT_FOUND') || code === 'BACKEND_ROUTE_NOT_FOUND' || /^HTTP_404$/i.test(code)) {
    return fallback;
  }
  if (/the page could not be found/i.test(rawMessage) || /\bnot[_\s-]?found\b/i.test(rawMessage)) {
    return fallback;
  }
  if (isOpaqueUiErrorMessage(rawMessage)) {
    return fallback;
  }

  return rawMessage;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCampaignDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (entry) => String(entry).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function parseCsvFileName(contentDisposition, fallbackName = 'insightdisc-export.csv') {
  const header = String(contentDisposition || '');
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]).replace(/[/\\]/g, '-');
  const quotedMatch = header.match(/filename="?([^";]+)"?/i);
  if (quotedMatch?.[1]) return quotedMatch[1].replace(/[/\\]/g, '-');
  return fallbackName;
}

function downloadBlob(blob, fileName) {
  const objectUrl = window.URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    window.URL.revokeObjectURL(objectUrl);
  }
}

function campaignStatusClass(status = '') {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ATIVA') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (normalized === 'AGENDADA') return 'bg-sky-100 text-sky-700 border-sky-200';
  if (normalized === 'EXPIRADA') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (normalized === 'PAUSADA') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (normalized === 'ESGOTADA') return 'bg-violet-100 text-violet-700 border-violet-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function itemStatusClass(status = '') {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'AVAILABLE' || normalized === 'CREATED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (normalized === 'REDEEMED' || normalized === 'ACTIVATED') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (normalized === 'EXPORTED') return 'bg-sky-100 text-sky-700 border-sky-200';
  if (normalized === 'EXPIRED' || normalized === 'DISABLED') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function SmallStatCard({ label, value, hint }) {
  return (
    <Card className="border-slate-200 bg-white/95 shadow-sm">
      <CardContent className="p-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function FiltersBar({ children }) {
  return <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">{children}</div>;
}

export default function CampaignsPanel() {
  const { toast } = useToast();
  const apiBaseUrl = getApiBaseUrl();
  const requestBaseUrl = apiBaseUrl;
  const directBackendRequestOptions = useMemo(
    () => buildDirectBackendRequestOptions(requestBaseUrl),
    [requestBaseUrl],
  );
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [campaigns, setCampaigns] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [promoAccounts, setPromoAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [couponCampaignFilter, setCouponCampaignFilter] = useState('ALL');
  const [couponStatusFilter, setCouponStatusFilter] = useState('ALL');
  const [promoCampaignFilter, setPromoCampaignFilter] = useState('ALL');
  const [promoStatusFilter, setPromoStatusFilter] = useState('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState(DEFAULT_FORM);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [couponDialog, setCouponDialog] = useState({ open: false, campaign: null, form: DEFAULT_COUPON_FORM });
  const [promoDialog, setPromoDialog] = useState({ open: false, campaign: null, form: DEFAULT_PROMO_FORM });
  const [runningCampaignAction, setRunningCampaignAction] = useState('');
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditCampaignName, setAuditCampaignName] = useState('');

  const loadData = useCallback(async ({ showRefreshState = false } = {}) => {
    if (!requestBaseUrl) {
      setSummary(EMPTY_SUMMARY);
      setCampaigns([]);
      setCoupons([]);
      setPromoAccounts([]);
      setLoading(false);
      setRefreshing(false);
      setError('');
      return;
    }

    if (showRefreshState) setRefreshing(true);
    else setLoading(true);

    setError('');
    try {
      const [overviewPayload, campaignsPayload, couponsPayload, promoPayload] = await Promise.all([
        apiRequest('/api/campaigns/overview', {
          method: 'GET',
          requireAuth: true,
          ...directBackendRequestOptions,
        }),
        apiRequest('/api/campaigns', {
          method: 'GET',
          requireAuth: true,
          ...directBackendRequestOptions,
        }),
        apiRequest('/api/campaigns/coupons', {
          method: 'GET',
          requireAuth: true,
          ...directBackendRequestOptions,
        }),
        apiRequest('/api/campaigns/promo-accounts', {
          method: 'GET',
          requireAuth: true,
          ...directBackendRequestOptions,
        }),
      ]);

      setSummary({ ...EMPTY_SUMMARY, ...(overviewPayload?.summary || {}) });
      setCampaigns(Array.isArray(campaignsPayload?.campaigns) ? campaignsPayload.campaigns : []);
      setCoupons(Array.isArray(couponsPayload?.coupons) ? couponsPayload.coupons : []);
      setPromoAccounts(Array.isArray(promoPayload?.promoAccounts) ? promoPayload.promoAccounts : []);
    } catch (loadError) {
      setError(normalizeSuperAdminUiError(loadError, 'Não foi possível carregar campanhas.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [directBackendRequestOptions, requestBaseUrl]);

  useEffect(() => {
    void loadData({ showRefreshState: false });
  }, [loadData]);

  const filteredCampaigns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      if (modeFilter !== 'ALL' && campaign.mode !== modeFilter) return false;
      if (statusFilter !== 'ALL' && campaign.status !== statusFilter) return false;
      if (!normalizedSearch) return true;
      const haystack = [campaign.name, campaign.slug, campaign.description]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return haystack.includes(normalizedSearch);
    });
  }, [campaigns, modeFilter, search, statusFilter]);

  const filteredCoupons = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return coupons.filter((coupon) => {
      if (couponCampaignFilter !== 'ALL' && coupon.campaignId !== couponCampaignFilter) return false;
      if (couponStatusFilter !== 'ALL' && coupon.status !== couponStatusFilter) return false;
      if (!normalizedSearch) return true;
      const haystack = [coupon.code, coupon.campaignName, coupon.redeemedBy?.email, coupon.redeemedBy?.name]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return haystack.includes(normalizedSearch);
    });
  }, [couponCampaignFilter, couponStatusFilter, coupons, search]);

  const filteredPromoAccounts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return promoAccounts.filter((item) => {
      if (promoCampaignFilter !== 'ALL' && item.campaignId !== promoCampaignFilter) return false;
      if (promoStatusFilter !== 'ALL' && item.status !== promoStatusFilter) return false;
      if (!normalizedSearch) return true;
      const haystack = [item.email, item.userName, item.campaignName, item.batchId]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return haystack.includes(normalizedSearch);
    });
  }, [promoAccounts, promoCampaignFilter, promoStatusFilter, search]);

  const campaignOptions = useMemo(() => campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name })), [campaigns]);

  const openCreateDialog = useCallback(() => {
    setEditingCampaign(null);
    setCampaignForm(DEFAULT_FORM);
    setCreateDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((campaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name || '',
      slug: campaign.slug || '',
      description: campaign.description || '',
      mode: campaign.mode || 'COUPON',
      creditsAmount: String(campaign.creditsAmount || 10),
      quantityPlanned: campaign.quantityPlanned == null ? '' : String(campaign.quantityPlanned),
      startsAt: formatCampaignDateInput(campaign.startsAt),
      expiresAt: formatCampaignDateInput(campaign.expiresAt),
      isActive: Boolean(campaign.isActive),
      allowMultipleRedemptionsPerUser: Boolean(campaign.allowMultipleRedemptionsPerUser),
      maxRedemptionsPerUser: String(campaign.maxRedemptionsPerUser || 1),
    });
    setCreateDialogOpen(true);
  }, []);

  const handleCampaignFormChange = (field, value) => {
    setCampaignForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCampaign = async () => {
    setSavingCampaign(true);
    try {
      const payload = {
        ...campaignForm,
        creditsAmount: Number(campaignForm.creditsAmount || 0),
        quantityPlanned: campaignForm.quantityPlanned === '' ? null : Number(campaignForm.quantityPlanned),
        maxRedemptionsPerUser: Number(campaignForm.maxRedemptionsPerUser || 1),
      };

      if (editingCampaign?.id) {
        await apiRequest(`/api/campaigns/${editingCampaign.id}`, {
          method: 'PATCH',
          requireAuth: true,
          body: payload,
          ...directBackendRequestOptions,
        });
      } else {
        await apiRequest('/api/campaigns', {
          method: 'POST',
          requireAuth: true,
          body: payload,
          ...directBackendRequestOptions,
        });
      }

      setCreateDialogOpen(false);
      toast({
        title: editingCampaign ? 'Campanha atualizada' : 'Campanha criada',
        description: 'Os dados da campanha foram salvos com sucesso.',
      });
      await loadData({ showRefreshState: true });
    } catch (saveError) {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar campanha',
        description: normalizeSuperAdminUiError(saveError, 'Tente novamente.'),
      });
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleCampaignStateChange = async (campaign, nextAction) => {
    const actionKey = `${nextAction}:${campaign.id}`;
    setRunningCampaignAction(actionKey);
    try {
      await apiRequest(`/api/campaigns/${campaign.id}/${nextAction}`, {
        method: 'POST',
        requireAuth: true,
        ...directBackendRequestOptions,
      });
      toast({
        title: nextAction === 'activate' ? 'Campanha ativada' : 'Campanha pausada',
        description: `${campaign.name} foi atualizada com sucesso.`,
      });
      await loadData({ showRefreshState: true });
    } catch (actionError) {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar campanha',
        description: normalizeSuperAdminUiError(actionError, 'Tente novamente.'),
      });
    } finally {
      setRunningCampaignAction('');
    }
  };

  const openCouponDialog = (campaign) => {
    setCouponDialog({
      open: true,
      campaign,
      form: {
        ...DEFAULT_COUPON_FORM,
        prefix: campaign.slug ? String(campaign.slug).slice(0, 10).toUpperCase() : '',
      },
    });
  };

  const handleGenerateCoupons = async () => {
    if (!couponDialog.campaign?.id) return;
    const quantity = Number(couponDialog.form.quantity || 0);
    if (quantity > 100) {
      const confirmed = window.confirm(`Gerar ${quantity} cupons agora?`);
      if (!confirmed) return;
    }

    const actionKey = `coupon:${couponDialog.campaign.id}`;
    setRunningCampaignAction(actionKey);
    try {
      const payload = await apiRequest(`/api/campaigns/${couponDialog.campaign.id}/coupons/generate`, {
        method: 'POST',
        requireAuth: true,
        body: {
          quantity,
          prefix: couponDialog.form.prefix,
          allowOverflow: Boolean(couponDialog.form.allowOverflow),
        },
        ...directBackendRequestOptions,
      });
      setCouponDialog({ open: false, campaign: null, form: DEFAULT_COUPON_FORM });
      toast({
        title: 'Cupons gerados',
        description: `${payload?.generatedCount || quantity} cupons criados para ${couponDialog.campaign.name}.`,
      });
      setActiveTab('coupons');
      setCouponCampaignFilter(couponDialog.campaign.id);
      await loadData({ showRefreshState: true });
    } catch (actionError) {
      toast({
        variant: 'destructive',
        title: 'Falha ao gerar cupons',
        description: normalizeSuperAdminUiError(actionError, 'Tente novamente.'),
      });
    } finally {
      setRunningCampaignAction('');
    }
  };

  const openPromoDialog = (campaign) => {
    setPromoDialog({
      open: true,
      campaign,
      form: {
        ...DEFAULT_PROMO_FORM,
        emailPrefix: campaign.slug ? `promo+${campaign.slug}` : '',
      },
    });
  };

  const downloadCsv = useCallback(async (path, fallbackName) => {
    const endpoint = resolveApiRequestUrl(path, directBackendRequestOptions);
    if (!endpoint) {
      throw new Error('CSV_ENDPOINT_MISSING');
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        ...getApiAuthHeaders(),
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.message || payload?.error || `HTTP_${response.status}`);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('CSV_EMPTY');
    }
    downloadBlob(blob, parseCsvFileName(response.headers.get('content-disposition'), fallbackName));
  }, [requestBaseUrl]);

  const handleGeneratePromoAccounts = async () => {
    if (!promoDialog.campaign?.id) return;
    const quantity = Number(promoDialog.form.quantity || 0);
    if (quantity > 50) {
      const confirmed = window.confirm(`Gerar ${quantity} contas promocionais agora? O CSV com senha temporária será baixado uma única vez.`);
      if (!confirmed) return;
    }

    const actionKey = `promo:${promoDialog.campaign.id}`;
    setRunningCampaignAction(actionKey);
    try {
      const payload = await apiRequest(`/api/campaigns/${promoDialog.campaign.id}/promo-accounts/generate`, {
        method: 'POST',
        requireAuth: true,
        body: {
          quantity,
          emailPrefix: promoDialog.form.emailPrefix,
          emailDomain: promoDialog.form.emailDomain,
          allowOverflow: Boolean(promoDialog.form.allowOverflow),
          userRole: promoDialog.form.userRole,
        },
        ...directBackendRequestOptions,
      });
      setPromoDialog({ open: false, campaign: null, form: DEFAULT_PROMO_FORM });
      toast({
        title: 'Contas promocionais geradas',
        description: `${payload?.generatedCount || quantity} contas criadas para ${promoDialog.campaign.name}.`,
      });
      if (payload?.downloadPath) {
        await downloadCsv(payload.downloadPath, `promo-accounts-${promoDialog.campaign.id}.csv`);
      }
      setActiveTab('promo-accounts');
      setPromoCampaignFilter(promoDialog.campaign.id);
      await loadData({ showRefreshState: true });
    } catch (actionError) {
      toast({
        variant: 'destructive',
        title: 'Falha ao gerar contas promocionais',
        description: normalizeSuperAdminUiError(actionError, 'Tente novamente.'),
      });
    } finally {
      setRunningCampaignAction('');
    }
  };

  const handleDisableCoupon = async (coupon) => {
    const confirmed = window.confirm(`Desabilitar o cupom ${coupon.code}?`);
    if (!confirmed) return;

    const actionKey = `disable:${coupon.id}`;
    setRunningCampaignAction(actionKey);
    try {
      await apiRequest(`/api/campaigns/coupons/${coupon.id}/disable`, {
        method: 'POST',
        requireAuth: true,
        ...directBackendRequestOptions,
      });
      toast({
        title: 'Cupom desabilitado',
        description: `${coupon.code} não poderá mais ser resgatado.`,
      });
      await loadData({ showRefreshState: true });
    } catch (actionError) {
      toast({
        variant: 'destructive',
        title: 'Falha ao desabilitar cupom',
        description: normalizeSuperAdminUiError(actionError, 'Tente novamente.'),
      });
    } finally {
      setRunningCampaignAction('');
    }
  };

  const handleOpenAudit = async (campaign) => {
    setAuditDialogOpen(true);
    setAuditCampaignName(campaign.name || 'Campanha');
    setLoadingAudit(true);
    setAuditLogs([]);
    try {
      const payload = await apiRequest(`/api/campaigns/${campaign.id}/audit`, {
        method: 'GET',
        requireAuth: true,
        ...directBackendRequestOptions,
      });
      setAuditLogs(Array.isArray(payload?.logs) ? payload.logs : []);
    } catch (auditError) {
      toast({
        variant: 'destructive',
        title: 'Falha ao carregar auditoria',
        description: normalizeSuperAdminUiError(auditError, 'Tente novamente.'),
      });
    } finally {
      setLoadingAudit(false);
    }
  };

  const exportCampaignsCsv = async () => {
    try {
      await downloadCsv('/api/campaigns/export/campaigns.csv', 'campaigns.csv');
      toast({ title: 'CSV exportado', description: 'Campanhas exportadas com sucesso.' });
    } catch (exportError) {
      toast({
        variant: 'destructive',
        title: 'Falha ao exportar campanhas',
        description: normalizeSuperAdminUiError(exportError, 'Tente novamente.'),
      });
    }
  };

  const exportCouponsCsv = async () => {
    const query = new URLSearchParams();
    if (couponCampaignFilter !== 'ALL') query.set('campaignId', couponCampaignFilter);
    if (couponStatusFilter !== 'ALL') query.set('status', couponStatusFilter);
    try {
      await downloadCsv(`/api/campaigns/export/coupons.csv?${query.toString()}`, 'campaign-coupons.csv');
      toast({ title: 'CSV exportado', description: 'Cupons exportados com sucesso.' });
    } catch (exportError) {
      toast({
        variant: 'destructive',
        title: 'Falha ao exportar cupons',
        description: normalizeSuperAdminUiError(exportError, 'Tente novamente.'),
      });
    }
  };

  const exportPromoAccountsCsv = async (includeSecrets = false) => {
    const query = new URLSearchParams();
    if (promoCampaignFilter !== 'ALL') query.set('campaignId', promoCampaignFilter);
    if (promoStatusFilter !== 'ALL') query.set('status', promoStatusFilter);
    if (includeSecrets) query.set('includeSecrets', '1');
    try {
      await downloadCsv(`/api/campaigns/export/promo-accounts.csv?${query.toString()}`, 'campaign-promo-accounts.csv');
      toast({
        title: 'CSV exportado',
        description: includeSecrets
          ? 'Contas promocionais exportadas com senhas temporárias.'
          : 'Contas promocionais exportadas com sucesso.',
      });
      await loadData({ showRefreshState: true });
    } catch (exportError) {
      toast({
        variant: 'destructive',
        title: 'Falha ao exportar contas promocionais',
        description: normalizeSuperAdminUiError(exportError, 'Tente novamente.'),
      });
    }
  };

  return (
    <section className="space-y-4" data-testid="super-admin-campaigns-panel">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Campanhas promocionais</h2>
          <p className="text-sm text-slate-400">
            Gere cupons, contas promocionais, exporte CSVs e acompanhe a auditoria sem mexer no site manualmente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={() => void loadData({ showRefreshState: true })} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={() => void exportCampaignsCsv()}>
            <Download className="w-4 h-4 mr-2" />
            CSV campanhas
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Nova campanha
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-red-400/40 bg-red-500/10">
          <CardContent className="p-4 text-sm text-red-100">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SmallStatCard label="Campanhas ativas" value={loading ? '...' : formatNumber(summary.campaignsActive)} hint={`Agendadas: ${formatNumber(summary.campaignsScheduled)}`} />
        <SmallStatCard label="Cupons disponíveis" value={loading ? '...' : formatNumber(summary.couponsAvailable)} hint={`Resgatados: ${formatNumber(summary.couponsRedeemed)}`} />
        <SmallStatCard label="Contas promocionais" value={loading ? '...' : formatNumber(summary.promoAccountsGenerated)} hint={`Cupons bloqueados: ${formatNumber(summary.couponsDisabled)}`} />
        <SmallStatCard label="Créditos distribuídos" value={loading ? '...' : formatNumber(summary.creditsDistributed)} hint={`Expiradas: ${formatNumber(summary.campaignsExpired)}`} />
        <SmallStatCard label="Pausadas / esgotadas" value={loading ? '...' : `${formatNumber(summary.campaignsPaused)} / ${formatNumber(summary.campaignsExhausted)}`} hint="Use os controles abaixo para reativar ou ampliar lotes." />
      </div>

      <Card className="border-slate-200 bg-white/95 shadow-sm">
        <CardContent className="p-4">
          <FiltersBar>
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, slug, código ou e-mail"
                  className="pl-9"
                />
              </div>
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os modos</SelectItem>
                  <SelectItem value="COUPON">Cupons</SelectItem>
                  <SelectItem value="PROMO_ACCOUNT">Contas promocionais</SelectItem>
                  <SelectItem value="BOTH">Ambos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  <SelectItem value="ATIVA">Ativa</SelectItem>
                  <SelectItem value="AGENDADA">Agendada</SelectItem>
                  <SelectItem value="EXPIRADA">Expirada</SelectItem>
                  <SelectItem value="PAUSADA">Pausada</SelectItem>
                  <SelectItem value="ESGOTADA">Esgotada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FiltersBar>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 h-auto flex flex-wrap justify-start">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white">Visão geral</TabsTrigger>
          <TabsTrigger value="coupons" className="data-[state=active]:bg-white">Cupons</TabsTrigger>
          <TabsTrigger value="promo-accounts" className="data-[state=active]:bg-white">Contas promocionais</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                Campanhas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Planejado</TableHead>
                    <TableHead>Gerado</TableHead>
                    <TableHead>Resgatado</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Expiração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{campaign.name}</div>
                        <div className="text-xs text-slate-500">/{campaign.slug || 'sem-slug'}</div>
                      </TableCell>
                      <TableCell>{campaign.mode}</TableCell>
                      <TableCell>{campaign.creditsAmount}</TableCell>
                      <TableCell>{campaign.quantityPlanned == null ? 'Livre' : campaign.quantityPlanned}</TableCell>
                      <TableCell>{campaign.quantityGenerated}</TableCell>
                      <TableCell>{campaign.quantityRedeemed}</TableCell>
                      <TableCell>{formatDateTime(campaign.startsAt)}</TableCell>
                      <TableCell>{formatDateTime(campaign.expiresAt)}</TableCell>
                      <TableCell>
                        <Badge className={`border ${campaignStatusClass(campaign.status)}`}>{campaign.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(campaign)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={runningCampaignAction === `${campaign.isActive ? 'pause' : 'activate'}:${campaign.id}`}
                            onClick={() => void handleCampaignStateChange(campaign, campaign.isActive ? 'pause' : 'activate')}
                          >
                            {campaign.isActive ? (
                              <><PauseCircle className="w-4 h-4 mr-1" />Pausar</>
                            ) : (
                              <><PlayCircle className="w-4 h-4 mr-1" />Ativar</>
                            )}
                          </Button>
                          {(campaign.mode === 'COUPON' || campaign.mode === 'BOTH') ? (
                            <Button size="sm" onClick={() => openCouponDialog(campaign)}>
                              <Ticket className="w-4 h-4 mr-1" />Cupons
                            </Button>
                          ) : null}
                          {(campaign.mode === 'PROMO_ACCOUNT' || campaign.mode === 'BOTH') ? (
                            <Button size="sm" variant="secondary" onClick={() => openPromoDialog(campaign)}>
                              <UserRoundPlus className="w-4 h-4 mr-1" />Contas
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setActiveTab('coupons');
                              setCouponCampaignFilter(campaign.id);
                            }}
                          >
                            Ver cupons
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setActiveTab('promo-accounts');
                              setPromoCampaignFilter(campaign.id);
                            }}
                          >
                            Ver contas
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void handleOpenAudit(campaign)}>
                            <History className="w-4 h-4 mr-1" />Auditoria
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!filteredCampaigns.length ? (
                <p className="text-sm text-slate-500 py-3">
                  Nenhuma campanha encontrada para os filtros atuais.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons" className="mt-0 space-y-4">
          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardContent className="p-4">
              <FiltersBar>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Select value={couponCampaignFilter} onValueChange={setCouponCampaignFilter}>
                    <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue placeholder="Campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas as campanhas</SelectItem>
                      {campaignOptions.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={couponStatusFilter} onValueChange={setCouponStatusFilter}>
                    <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue placeholder="Status do cupom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os status</SelectItem>
                      <SelectItem value="AVAILABLE">Disponível</SelectItem>
                      <SelectItem value="REDEEMED">Resgatado</SelectItem>
                      <SelectItem value="DISABLED">Desabilitado</SelectItem>
                      <SelectItem value="EXPIRED">Expirado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="border-slate-300" onClick={() => void exportCouponsCsv()}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar cupons
                </Button>
              </FiltersBar>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900">Cupons gerados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Resgate</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-medium text-slate-900">{coupon.code}</TableCell>
                      <TableCell>{coupon.campaignName}</TableCell>
                      <TableCell>{coupon.creditsAmount}</TableCell>
                      <TableCell>
                        <Badge className={`border ${itemStatusClass(coupon.status)}`}>{coupon.status}</Badge>
                      </TableCell>
                      <TableCell>{coupon.redeemedBy?.email || '-'}</TableCell>
                      <TableCell>{formatDateTime(coupon.redeemedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={coupon.status !== 'AVAILABLE' || runningCampaignAction === `disable:${coupon.id}`}
                          onClick={() => void handleDisableCoupon(coupon)}
                        >
                          Desabilitar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!filteredCoupons.length ? (
                <p className="text-sm text-slate-500 py-3">Nenhum cupom encontrado.</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promo-accounts" className="mt-0 space-y-4">
          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardContent className="p-4">
              <FiltersBar>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Select value={promoCampaignFilter} onValueChange={setPromoCampaignFilter}>
                    <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue placeholder="Campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas as campanhas</SelectItem>
                      {campaignOptions.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={promoStatusFilter} onValueChange={setPromoStatusFilter}>
                    <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue placeholder="Status da conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os status</SelectItem>
                      <SelectItem value="CREATED">Criada</SelectItem>
                      <SelectItem value="EXPORTED">Exportada</SelectItem>
                      <SelectItem value="ACTIVATED">Ativada</SelectItem>
                      <SelectItem value="DISABLED">Desabilitada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="border-slate-300" onClick={() => void exportPromoAccountsCsv(false)}>
                    <Download className="w-4 h-4 mr-2" />
                    CSV sem senhas
                  </Button>
                  <Button onClick={() => void exportPromoAccountsCsv(true)}>
                    <Download className="w-4 h-4 mr-2" />
                    CSV com senhas
                  </Button>
                </div>
              </FiltersBar>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900">Contas promocionais geradas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Criada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromoAccounts.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-900">{item.email}</TableCell>
                      <TableCell>{item.campaignName}</TableCell>
                      <TableCell>{item.userRole}</TableCell>
                      <TableCell>{item.creditsGranted}</TableCell>
                      <TableCell>
                        <Badge className={`border ${itemStatusClass(item.status)}`}>{item.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.batchId}</TableCell>
                      <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!filteredPromoAccounts.length ? (
                <p className="text-sm text-slate-500 py-3">Nenhuma conta promocional encontrada.</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Editar campanha' : 'Nova campanha'}</DialogTitle>
            <DialogDescription>
              Defina créditos por item, modo de operação, calendário e limites por usuário.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="campaign-name">Nome</Label>
              <Input id="campaign-name" value={campaignForm.name} onChange={(event) => handleCampaignFormChange('name', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-slug">Slug</Label>
              <Input id="campaign-slug" value={campaignForm.slug} onChange={(event) => handleCampaignFormChange('slug', event.target.value)} placeholder="campanha-marco" />
            </div>
            <div className="space-y-2">
              <Label>Modo</Label>
              <Select value={campaignForm.mode} onValueChange={(value) => handleCampaignFormChange('mode', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COUPON">COUPON</SelectItem>
                  <SelectItem value="PROMO_ACCOUNT">PROMO_ACCOUNT</SelectItem>
                  <SelectItem value="BOTH">BOTH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="campaign-description">Descrição</Label>
              <Textarea id="campaign-description" value={campaignForm.description} onChange={(event) => handleCampaignFormChange('description', event.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-credits">Créditos por item</Label>
              <Input id="campaign-credits" type="number" min="1" value={campaignForm.creditsAmount} onChange={(event) => handleCampaignFormChange('creditsAmount', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-planned">Quantidade planejada</Label>
              <Input id="campaign-planned" type="number" min="0" value={campaignForm.quantityPlanned} onChange={(event) => handleCampaignFormChange('quantityPlanned', event.target.value)} placeholder="Livre" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-start">Início</Label>
              <Input id="campaign-start" type="datetime-local" value={campaignForm.startsAt} onChange={(event) => handleCampaignFormChange('startsAt', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-expire">Expiração</Label>
              <Input id="campaign-expire" type="datetime-local" value={campaignForm.expiresAt} onChange={(event) => handleCampaignFormChange('expiresAt', event.target.value)} />
            </div>
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Campanha ativa</p>
                  <p className="text-xs text-slate-500">Campanhas pausadas não aceitam resgates.</p>
                </div>
                <Switch checked={campaignForm.isActive} onCheckedChange={(value) => handleCampaignFormChange('isActive', value)} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Permitir múltiplos resgates por usuário</p>
                  <p className="text-xs text-slate-500">Quando desligado, cada usuário pode resgatar apenas uma vez.</p>
                </div>
                <Switch checked={campaignForm.allowMultipleRedemptionsPerUser} onCheckedChange={(value) => handleCampaignFormChange('allowMultipleRedemptionsPerUser', value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-limit">Máximo por usuário</Label>
                <Input id="campaign-limit" type="number" min="1" value={campaignForm.maxRedemptionsPerUser} onChange={(event) => handleCampaignFormChange('maxRedemptionsPerUser', event.target.value)} disabled={!campaignForm.allowMultipleRedemptionsPerUser} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void handleSaveCampaign()} disabled={savingCampaign}>
              {savingCampaign ? 'Salvando...' : editingCampaign ? 'Salvar alterações' : 'Criar campanha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={couponDialog.open} onOpenChange={(open) => setCouponDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar cupons</DialogTitle>
            <DialogDescription>
              Campanha: {couponDialog.campaign?.name || '-'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-quantity">Quantidade</Label>
              <Input id="coupon-quantity" type="number" min="1" max="500" value={couponDialog.form.quantity} onChange={(event) => setCouponDialog((prev) => ({ ...prev, form: { ...prev.form, quantity: event.target.value } }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-prefix">Prefixo opcional</Label>
              <Input id="coupon-prefix" value={couponDialog.form.prefix} onChange={(event) => setCouponDialog((prev) => ({ ...prev, form: { ...prev.form, prefix: event.target.value } }))} placeholder="INSIGHT" />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Permitir ultrapassar o planejado</p>
                <p className="text-xs text-slate-500">Use apenas quando quiser extrapolar o teto da campanha.</p>
              </div>
              <Switch checked={couponDialog.form.allowOverflow} onCheckedChange={(value) => setCouponDialog((prev) => ({ ...prev, form: { ...prev.form, allowOverflow: value } }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponDialog({ open: false, campaign: null, form: DEFAULT_COUPON_FORM })}>Cancelar</Button>
            <Button onClick={() => void handleGenerateCoupons()} disabled={runningCampaignAction === `coupon:${couponDialog.campaign?.id || ''}`}>
              {runningCampaignAction === `coupon:${couponDialog.campaign?.id || ''}` ? 'Gerando...' : 'Gerar cupons'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoDialog.open} onOpenChange={(open) => setPromoDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar contas promocionais</DialogTitle>
            <DialogDescription>
              O CSV com senha temporária só deve ser exportado para entrega controlada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="promo-quantity">Quantidade</Label>
                <Input id="promo-quantity" type="number" min="1" max="500" value={promoDialog.form.quantity} onChange={(event) => setPromoDialog((prev) => ({ ...prev, form: { ...prev.form, quantity: event.target.value } }))} />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={promoDialog.form.userRole} onValueChange={(value) => setPromoDialog((prev) => ({ ...prev, form: { ...prev.form, userRole: value } }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="PRO">PRO</SelectItem>
                    <SelectItem value="CANDIDATE">CANDIDATE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-prefix">Prefixo do e-mail</Label>
                <Input id="promo-prefix" value={promoDialog.form.emailPrefix} onChange={(event) => setPromoDialog((prev) => ({ ...prev, form: { ...prev.form, emailPrefix: event.target.value } }))} placeholder="promo+marco" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-domain">Domínio</Label>
                <Input id="promo-domain" value={promoDialog.form.emailDomain} onChange={(event) => setPromoDialog((prev) => ({ ...prev, form: { ...prev.form, emailDomain: event.target.value } }))} placeholder="insightdisc.app" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Permitir ultrapassar o planejado</p>
                <p className="text-xs text-slate-500">Use apenas com aprovação operacional.</p>
              </div>
              <Switch checked={promoDialog.form.allowOverflow} onCheckedChange={(value) => setPromoDialog((prev) => ({ ...prev, form: { ...prev.form, allowOverflow: value } }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialog({ open: false, campaign: null, form: DEFAULT_PROMO_FORM })}>Cancelar</Button>
            <Button onClick={() => void handleGeneratePromoAccounts()} disabled={runningCampaignAction === `promo:${promoDialog.campaign?.id || ''}`}>
              {runningCampaignAction === `promo:${promoDialog.campaign?.id || ''}` ? 'Gerando...' : 'Gerar contas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Auditoria da campanha</DialogTitle>
            <DialogDescription>{auditCampaignName || 'Campanha selecionada'}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Ator</TableHead>
                  <TableHead>Metadados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAudit ? (
                  <TableRow>
                    <TableCell colSpan={5}>Carregando auditoria...</TableCell>
                  </TableRow>
                ) : auditLogs.length ? (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.targetType}:{' '}{log.targetId}</TableCell>
                      <TableCell>{log.actor?.email || '-'}</TableCell>
                      <TableCell className="max-w-[360px] whitespace-pre-wrap break-words text-xs text-slate-500">
                        {JSON.stringify(log.metadata || {}, null, 2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>Nenhum evento registrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
