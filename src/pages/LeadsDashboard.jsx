import React, { useMemo, useState } from 'react';
import { Download, MessageCircle, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import {
  apiRequest,
  getApiAuthHeaders,
  getApiBaseUrl,
} from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import LeadStatusBadge from '@/components/leads/LeadStatusBadge';
import {
  buildWhatsAppLeadMessage,
  buildWhatsAppLeadUrl,
  formatLeadDate,
  LEAD_STATUS_OPTIONS,
} from '@/components/leads/lead-utils';
import { PERMISSIONS, hasPermission } from '@/modules/auth/access-control';

const LOCAL_LEADS_KEY = 'insightdisc_chatbot_leads';

function normalizeLocalLead(item = {}, index = 0) {
  const payload = item?.payload || {};
  return {
    id: item?.id || `local-lead-${index}-${item?.createdAt || Date.now()}`,
    createdAt: item?.createdAt || new Date().toISOString(),
    source: item?.source || 'chatbot',
    name: payload?.name || item?.name || '',
    email: payload?.email || item?.email || '',
    phone: payload?.phone || item?.phone || '',
    company: payload?.company || item?.company || '',
    interest: payload?.interest || item?.interest || '',
    message: payload?.message || item?.message || '',
    status: item?.status || 'new',
    tags: payload?.tags || item?.tags || [],
    page: payload?.page || item?.page || '',
    assignedTo: item?.assignedTo || '',
    notes: item?.notes || '',
  };
}

function loadLocalLeads() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_LEADS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => normalizeLocalLead(item, index));
  } catch {
    return [];
  }
}

function toCsv(leads = []) {
  const header = [
    'Data',
    'Nome',
    'Email',
    'Telefone',
    'Empresa',
    'Interesse',
    'Mensagem',
    'Status',
    'Origem',
  ];
  const lines = [header, ...leads.map((lead) => [
    formatLeadDate(lead.createdAt),
    lead.name || '',
    lead.email || '',
    lead.phone || '',
    lead.company || '',
    lead.interest || '',
    lead.message || '',
    lead.status || '',
    lead.source || '',
  ])];

  return lines
    .map((line) => line.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export default function LeadsDashboard() {
  const { access } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiBaseUrl = getApiBaseUrl();

  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [notesByLead, setNotesByLead] = useState({});
  const [updatingLeadId, setUpdatingLeadId] = useState('');

  const canAccessLeads =
    hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT) ||
    ['ADMIN', 'PRO', 'PLATFORM_ADMIN'].includes(String(access?.user?.role || '').toUpperCase());

  const leadsQuery = useQuery({
    queryKey: ['leads-dashboard', apiBaseUrl, statusFilter, searchTerm],
    queryFn: async () => {
      if (!canAccessLeads) return [];

      if (apiBaseUrl) {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        if (searchTerm.trim()) params.set('search', searchTerm.trim());

        const payload = await apiRequest(`/api/leads?${params.toString()}`, {
          method: 'GET',
          requireAuth: true,
        });
        return payload?.leads || [];
      }

      return loadLocalLeads();
    },
    enabled: canAccessLeads,
  });

  const leads = useMemo(() => {
    const items = Array.isArray(leadsQuery.data) ? leadsQuery.data : [];
    return items
      .map((lead, index) => normalizeLocalLead(lead, index))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leadsQuery.data]);

  const updateLead = async (lead, patch = {}) => {
    if (!lead?.id) return;
    setUpdatingLeadId(lead.id);
    try {
      if (apiBaseUrl) {
        await apiRequest(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          requireAuth: true,
          body: patch,
        });
        await queryClient.invalidateQueries({ queryKey: ['leads-dashboard'] });
      } else {
        const current = loadLocalLeads();
        const next = current.map((item) =>
          item.id === lead.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
        );
        window.localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(next));
        await queryClient.invalidateQueries({ queryKey: ['leads-dashboard'] });
      }

      toast({
        title: 'Lead atualizado',
        description: 'Alterações salvas com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar lead',
        description: error?.message || 'Não foi possível atualizar.',
      });
    } finally {
      setUpdatingLeadId('');
    }
  };

  const handleExportCsv = async () => {
    try {
      if (apiBaseUrl) {
        const response = await fetch(`${apiBaseUrl}/api/leads/export/csv`, {
          method: 'GET',
          headers: {
            ...getApiAuthHeaders(),
          },
        });

        if (!response.ok) {
          throw new Error('Não foi possível exportar CSV.');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `insightdisc-leads-${Date.now()}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } else {
        const csv = `\uFEFF${toCsv(leads)}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `insightdisc-leads-local-${Date.now()}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao exportar CSV',
        description: error?.message || 'Tente novamente.',
      });
    }
  };

  const handleWhatsapp = async (lead) => {
    const url = buildWhatsAppLeadUrl(lead);
    const message = buildWhatsAppLeadMessage(lead);

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: 'Mensagem copiada',
        description: 'Lead sem telefone. A mensagem foi copiada para envio manual.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Telefone ausente',
        description: 'Cadastre um telefone para abrir WhatsApp direto.',
      });
    }
  };

  if (!canAccessLeads) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-6 text-sm text-slate-600">
            Acesso restrito. Esta área comercial está disponível somente para perfis Admin/Profissional.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Leads comerciais</CardTitle>
            <Button onClick={handleExportCsv} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, e-mail ou empresa..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Todos os status</option>
              {LEAD_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {leadsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Carregando leads...</p>
          ) : leads.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum lead encontrado para os filtros selecionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Telefone</th>
                    <th className="py-2 pr-3">Empresa</th>
                    <th className="py-2 pr-3">Interesse</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Origem</th>
                    <th className="py-2 pr-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3 whitespace-nowrap">{formatLeadDate(lead.createdAt)}</td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900">{lead.name || '-'}</div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">{lead.message || ''}</div>
                      </td>
                      <td className="py-3 pr-3">{lead.email || '-'}</td>
                      <td className="py-3 pr-3">{lead.phone || '-'}</td>
                      <td className="py-3 pr-3">{lead.company || '-'}</td>
                      <td className="py-3 pr-3">{lead.interest || '-'}</td>
                      <td className="py-3 pr-3">
                        <div className="space-y-2">
                          <LeadStatusBadge status={lead.status} />
                          <select
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                            value={lead.status || 'new'}
                            onChange={(event) =>
                              updateLead(lead, { status: event.target.value })
                            }
                            disabled={updatingLeadId === lead.id}
                          >
                            {LEAD_STATUS_OPTIONS.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="py-3 pr-3">{lead.source || 'chatbot'}</td>
                      <td className="py-3 pr-3 min-w-[220px]">
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsapp(lead)}
                            className="w-full justify-start"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                          </Button>

                          <Input
                            value={notesByLead[lead.id] ?? lead.notes ?? ''}
                            onChange={(event) =>
                              setNotesByLead((prev) => ({
                                ...prev,
                                [lead.id]: event.target.value,
                              }))
                            }
                            placeholder="Adicionar nota..."
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              updateLead(lead, { notes: notesByLead[lead.id] ?? lead.notes ?? '' })
                            }
                            disabled={updatingLeadId === lead.id}
                            className="w-full"
                          >
                            Salvar nota
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
