import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileBarChart2,
  FileText,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EMPTY_OVERVIEW = Object.freeze({
  usersTotal: 0,
  assessmentsTotal: 0,
  reportsTotal: 0,
  leadsTotal: 0,
  paymentsTotal: 0,
  paymentsApproved: 0,
  revenueTotal: 0,
  workspacesTotal: 0,
  creditsConsumed: 0,
  latestUsers: [],
  latestReports: [],
  latestLeads: [],
  latestPayments: [],
  latestWorkspaces: [],
  latestAssessments: [],
  monitor: {
    generatedAt: '',
    datasets: {},
  },
});

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

function formatDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function statusBadgeClass(status = '') {
  const key = String(status || '').toLowerCase();
  if (key === 'new') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (key === 'contacted') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (key === 'qualified') return 'bg-violet-100 text-violet-700 border-violet-200';
  if (key === 'proposal') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (key === 'won' || key === 'paid') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (key === 'lost' || key === 'failed') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (key === 'pending') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="border-slate-200 bg-white/95 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TableContainer({ title, children, id }) {
  return (
    <Card className="border-slate-200 bg-white/95 shadow-sm" data-testid={id}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [updatingLeadId, setUpdatingLeadId] = useState('');
  const [generatingReport, setGeneratingReport] = useState('');

  const apiBaseUrl = getApiBaseUrl();
  const token = getApiToken();

  const loadOverview = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) setRefreshing(true);
    setLoading((prev) => (showRefreshState ? prev : true));
    setError('');
    try {
      const payload = await apiRequest('/super-admin/overview', {
        method: 'GET',
        requireAuth: true,
      });
      setOverview({
        ...EMPTY_OVERVIEW,
        ...payload,
      });
    } catch (loadError) {
      setError(loadError?.payload?.error || loadError?.message || 'Falha ao carregar dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview(false);
  }, [loadOverview]);

  const cards = useMemo(
    () => [
      { icon: Users, label: 'Total de usuários', value: overview.usersTotal },
      { icon: FileText, label: 'Total de avaliações', value: overview.assessmentsTotal },
      { icon: FileBarChart2, label: 'Total de relatórios', value: overview.reportsTotal },
      { icon: Wallet, label: 'Créditos consumidos', value: overview.creditsConsumed },
      { icon: Activity, label: 'Leads capturados', value: overview.leadsTotal },
      { icon: CreditCard, label: 'Pagamentos aprovados', value: overview.paymentsApproved },
      { icon: Building2, label: 'Workspaces ativos', value: overview.workspacesTotal },
      { icon: BarChart3, label: 'Receita total', value: formatCurrency(overview.revenueTotal) },
    ],
    [overview],
  );

  const latestDemoAssessment = overview.latestAssessments?.[0] || null;
  const latestDemoReport = latestDemoAssessment?.reportId
    ? overview.latestReports?.find((report) => report.assessmentId === latestDemoAssessment.id) ||
      null
    : null;

  const handleLogout = () => {
    logout(false);
    navigate('/super-admin-login', { replace: true });
  };

  const handleCopyText = async (text, label) => {
    if (!text) {
      toast({
        variant: 'destructive',
        title: 'Nada para copiar',
        description: `Não há ${label} disponível para esta linha.`,
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(String(text));
      toast({
        title: 'Copiado',
        description: `${label} copiado para a área de transferência.`,
      });
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao copiar',
        description: 'Não foi possível copiar no seu navegador.',
      });
    }
  };

  const handleOpenLeadWhatsapp = (lead) => {
    const normalized = normalizePhone(lead?.phone || '');
    const message = encodeURIComponent(
      `Olá ${lead?.name || ''}, aqui é do InsightDISC. Recebemos seu interesse em ${lead?.interest || 'nossos serviços'}. Podemos te ajudar com os próximos passos.`,
    );

    if (!normalized) {
      void handleCopyText(
        decodeURIComponent(message),
        'Mensagem de WhatsApp',
      );
      return;
    }

    window.open(`https://wa.me/${normalized}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleExportLeadsCsv = async () => {
    if (!apiBaseUrl || !token) {
      toast({
        variant: 'destructive',
        title: 'Exportação indisponível',
        description: 'Sessão inválida para exportar CSV de leads.',
      });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/leads/export/csv`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `insightdisc-leads-${Date.now()}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'CSV exportado',
        description: 'Arquivo de leads baixado com sucesso.',
      });
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao exportar CSV',
        description: 'Não foi possível exportar os leads neste momento.',
      });
    }
  };

  const handleUpdateLeadStatus = async (leadId, status) => {
    if (!leadId || !status) return;

    setUpdatingLeadId(leadId);
    try {
      const payload = await apiRequest(`/api/leads/${leadId}`, {
        method: 'PATCH',
        requireAuth: true,
        body: { status },
      });

      setOverview((prev) => ({
        ...prev,
        latestLeads: prev.latestLeads.map((lead) =>
          lead.id === leadId ? { ...lead, status: payload?.lead?.status || status } : lead,
        ),
      }));
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar lead',
        description: 'Não foi possível alterar o status do lead.',
      });
    } finally {
      setUpdatingLeadId('');
    }
  };

  const handleGenerateReportFromAssessment = async (assessmentId) => {
    if (!assessmentId) {
      toast({
        variant: 'destructive',
        title: 'Assessment não encontrado',
        description: 'Não há assessment disponível para gerar o relatório.',
      });
      return;
    }

    setGeneratingReport(assessmentId);
    try {
      const payload = await apiRequest('/report/generate', {
        method: 'POST',
        requireAuth: true,
        body: { assessmentId },
      });

      const pdfUrl = payload?.pdfUrl || payload?.report?.pdfUrl || '';
      setOverview((prev) => ({
        ...prev,
        latestReports: prev.latestReports.map((report) =>
          report.assessmentId === assessmentId
            ? { ...report, pdfUrl: pdfUrl || report.pdfUrl }
            : report,
        ),
      }));

      toast({
        title: 'Relatório gerado',
        description: 'A geração premium foi concluída com sucesso.',
      });
    } catch (_error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao gerar relatório',
        description: 'Não foi possível gerar o PDF para este assessment.',
      });
    } finally {
      setGeneratingReport('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,.20),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,.14),transparent_35%)]" />

      <header className="relative border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Administração global</p>
            <h1 className="text-2xl font-semibold text-white">Painel Super Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
              onClick={() => navigate('/Dashboard')}
            >
              Voltar ao app
            </Button>
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => void loadOverview(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        <Card className="border-indigo-400/30 bg-indigo-500/10 text-indigo-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-indigo-100">
              <ShieldCheck className="w-5 h-5" />
              Sessão super admin validada
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <strong>Usuário:</strong> {user?.name || user?.email || 'Super Admin'}
            </p>
            <p>
              <strong>E-mail:</strong> {user?.email || '-'}
            </p>
            <p>
              <strong>Última leitura:</strong> {overview.monitor?.generatedAt ? formatDate(overview.monitor.generatedAt) : '-'}
            </p>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-red-400/40 bg-red-500/10">
            <CardContent className="p-4 text-sm text-red-100">{error}</CardContent>
          </Card>
        ) : null}

        <section className="space-y-3" data-testid="super-admin-overview-cards">
          <h2 className="text-lg font-semibold text-white">Visão Geral</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <StatCard key={card.label} icon={card.icon} label={card.label} value={loading ? '...' : card.value} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Leads</h2>
          <TableContainer title="Leads mais recentes" id="super-admin-leads-table">
            <div className="flex justify-end pb-3">
              <Button
                variant="outline"
                className="border-slate-300"
                onClick={handleExportLeadsCsv}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3">E-mail</th>
                    <th className="py-2 pr-3">WhatsApp</th>
                    <th className="py-2 pr-3">Origem</th>
                    <th className="py-2 pr-3">Interesse</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Criado em</th>
                    <th className="py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.latestLeads || []).map((lead) => (
                    <tr key={lead.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">{lead.name}</td>
                      <td className="py-3 pr-3">{lead.email}</td>
                      <td className="py-3 pr-3">{lead.phone || '-'}</td>
                      <td className="py-3 pr-3">{lead.source || '-'}</td>
                      <td className="py-3 pr-3">{lead.interest || '-'}</td>
                      <td className="py-3 pr-3">
                        <Select
                          value={lead.status || 'new'}
                          onValueChange={(value) => void handleUpdateLeadStatus(lead.id, value)}
                          disabled={updatingLeadId === lead.id}
                        >
                          <SelectTrigger className="h-8 min-w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 pr-3">{formatDate(lead.createdAt)}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => void handleCopyText(lead.email, 'E-mail')}>
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </Button>
                          <Button size="sm" onClick={() => handleOpenLeadWhatsapp(lead)}>
                            WhatsApp
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!overview.latestLeads?.length ? (
              <p className="text-sm text-slate-500 py-4">Nenhum lead capturado até o momento.</p>
            ) : null}
          </TableContainer>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Vendas / Pagamentos</h2>
          <TableContainer title="Pagamentos recentes">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Plano</th>
                    <th className="py-2 pr-3">Valor</th>
                    <th className="py-2 pr-3">Créditos</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.latestPayments || []).map((payment) => (
                    <tr key={payment.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-800">{payment.customerName || '-'}</div>
                        <div className="text-xs text-slate-500">{payment.customerEmail || '-'}</div>
                      </td>
                      <td className="py-3 pr-3">{payment.plan}</td>
                      <td className="py-3 pr-3">{formatCurrency(payment.amount)}</td>
                      <td className="py-3 pr-3">{payment.creditsAdded}</td>
                      <td className="py-3 pr-3">
                        <Badge className={`border ${statusBadgeClass(payment.status)}`}>{payment.status}</Badge>
                      </td>
                      <td className="py-3">{formatDate(payment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!overview.latestPayments?.length ? (
              <p className="text-sm text-slate-500 py-4">Nenhum pagamento registrado.</p>
            ) : null}
          </TableContainer>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Usuários</h2>
          <TableContainer title="Usuários mais recentes">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3">E-mail</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Workspace</th>
                    <th className="py-2 pr-3">Créditos</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.latestUsers || []).map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">{item.name || '-'}</td>
                      <td className="py-3 pr-3">{item.email || '-'}</td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline">{item.role || '-'}</Badge>
                      </td>
                      <td className="py-3 pr-3">{item.workspace || '-'}</td>
                      <td className="py-3 pr-3">{item.credits}</td>
                      <td className="py-3 pr-3">{item.status || 'ativo'}</td>
                      <td className="py-3">{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!overview.latestUsers?.length ? (
              <p className="text-sm text-slate-500 py-4">Nenhum usuário encontrado.</p>
            ) : null}
          </TableContainer>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Relatórios</h2>
          <TableContainer title="Relatórios mais recentes">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">Participante</th>
                    <th className="py-2 pr-3">Perfil</th>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">PDF</th>
                    <th className="py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.latestReports || []).map((report) => (
                    <tr key={report.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-800">{report.participant}</div>
                        <div className="text-xs text-slate-500">{report.organization}</div>
                      </td>
                      <td className="py-3 pr-3">{report.profile || '-'}</td>
                      <td className="py-3 pr-3">{formatDate(report.createdAt)}</td>
                      <td className="py-3 pr-3">
                        {report.pdfUrl ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Disponível
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                            Pendente
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/Report?id=${report.assessmentId}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!report.pdfUrl}
                            onClick={() => window.open(report.pdfUrl, '_blank', 'noopener,noreferrer')}
                          >
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            disabled={generatingReport === report.assessmentId}
                            onClick={() => void handleGenerateReportFromAssessment(report.assessmentId)}
                          >
                            {generatingReport === report.assessmentId ? 'Gerando...' : 'Regenerar PDF'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleCopyText(report.publicLink, 'Link público')}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Link
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!overview.latestReports?.length ? (
              <p className="text-sm text-slate-500 py-4">Nenhum relatório gerado.</p>
            ) : null}
          </TableContainer>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Workspaces / Tenants</h2>
          <TableContainer title="Workspaces mais recentes">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">Organização</th>
                    <th className="py-2 pr-3">Owner/Admin</th>
                    <th className="py-2 pr-3">Usuários</th>
                    <th className="py-2 pr-3">Avaliações</th>
                    <th className="py-2 pr-3">Créditos</th>
                    <th className="py-2 pr-3">Branding</th>
                    <th className="py-2">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.latestWorkspaces || []).map((workspace) => (
                    <tr key={workspace.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">{workspace.name}</td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-800">{workspace.ownerName || '-'}</div>
                        <div className="text-xs text-slate-500">{workspace.ownerEmail || '-'}</div>
                      </td>
                      <td className="py-3 pr-3">{workspace.usersCount}</td>
                      <td className="py-3 pr-3">{workspace.assessmentsCount}</td>
                      <td className="py-3 pr-3">{workspace.creditsAvailable}</td>
                      <td className="py-3 pr-3">
                        <Badge
                          className={
                            workspace.brandingConfigured
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }
                        >
                          {workspace.brandingConfigured ? 'Configurado' : 'Pendente'}
                        </Badge>
                      </td>
                      <td className="py-3">{formatDate(workspace.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!overview.latestWorkspaces?.length ? (
              <p className="text-sm text-slate-500 py-4">Nenhum workspace encontrado.</p>
            ) : null}
          </TableContainer>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <TableContainer title="Monitoramento rápido">
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                <strong>Gerado em:</strong> {overview.monitor?.generatedAt ? formatDate(overview.monitor.generatedAt) : '-'}
              </p>
              <p>
                <strong>Datasets carregados:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {Object.entries(overview.monitor?.datasets || {}).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
              <p className="text-slate-500">
                Para ações operacionais de tenant use também o console em{' '}
                <Link className="text-indigo-700 hover:text-indigo-800" to="/AdminDashboard">
                  /AdminDashboard
                </Link>
                .
              </p>
            </div>
          </TableContainer>

          <Card className="border-slate-200 bg-white/95 shadow-sm" data-testid="super-admin-demo-tools">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-900">Testes de Relatório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => navigate('/SendAssessment?mode=demo')}>
                  Gerar assessment demo
                </Button>
                <Button
                  onClick={() => void handleGenerateReportFromAssessment(latestDemoAssessment?.id)}
                  disabled={!latestDemoAssessment?.id || generatingReport === latestDemoAssessment?.id}
                >
                  {generatingReport === latestDemoAssessment?.id ? 'Gerando...' : 'Gerar relatório demo'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => latestDemoAssessment?.id && navigate(`/Report?id=${latestDemoAssessment.id}`)}
                  disabled={!latestDemoAssessment?.id}
                >
                  Abrir preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => latestDemoReport?.pdfUrl && window.open(latestDemoReport.pdfUrl, '_blank', 'noopener,noreferrer')}
                  disabled={!latestDemoReport?.pdfUrl}
                >
                  Abrir PDF demo
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                <p>
                  <strong>Último assessment demo:</strong> {latestDemoAssessment?.id || 'Nenhum'}
                </p>
                <p>
                  <strong>Último perfil demo:</strong> {latestDemoAssessment?.profile || '-'}
                </p>
                <p>
                  <strong>PDF disponível:</strong> {latestDemoReport?.pdfUrl ? 'Sim' : 'Não'}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

