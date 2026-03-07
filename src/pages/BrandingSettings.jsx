import React, { useEffect, useMemo, useState } from 'react';
import { ImageUp, Palette, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import CreditPaywallCard from '@/components/billing/CreditPaywallCard';

const FALLBACK_BRANDING = Object.freeze({
  company_name: 'InsightDISC',
  logo_url: '/brand/insightdisc-logo-transparent.png',
  brand_primary_color: '#0b1f3b',
  brand_secondary_color: '#f7b500',
  report_footer_text: 'InsightDISC - Plataforma de Análise Comportamental',
});

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6})$/;

function normalizeBranding(input = {}) {
  return {
    company_name: String(input?.company_name || FALLBACK_BRANDING.company_name),
    logo_url: String(input?.logo_url || FALLBACK_BRANDING.logo_url),
    brand_primary_color: String(
      input?.brand_primary_color || FALLBACK_BRANDING.brand_primary_color
    ).toLowerCase(),
    brand_secondary_color: String(
      input?.brand_secondary_color || FALLBACK_BRANDING.brand_secondary_color
    ).toLowerCase(),
    report_footer_text: String(
      input?.report_footer_text || FALLBACK_BRANDING.report_footer_text
    ),
  };
}

export default function BrandingSettings() {
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  const workspaceId = useMemo(
    () => access?.tenantId || user?.active_workspace_id || '',
    [access?.tenantId, user?.active_workspace_id]
  );

  const [form, setForm] = useState(normalizeBranding());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [workspaceCredits, setWorkspaceCredits] = useState(null);
  const availableCredits = Number(user?.credits ?? workspaceCredits ?? 0);
  const canEditBranding = availableCredits > 0;

  useEffect(() => {
    const loadBranding = async () => {
      if (!workspaceId) {
        setLoading(false);
        setError('Workspace não identificado para carregar branding.');
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (apiBaseUrl) {
          const payload = await apiRequest(`/branding/${workspaceId}`, {
            method: 'GET',
            requireAuth: true,
          });

          setForm(normalizeBranding(payload));
          setLoading(false);
          return;
        }

        const workspaces = await base44.entities.Workspace.filter({ id: workspaceId });
        if (workspaces.length > 0) {
          const workspace = workspaces[0];
          setWorkspaceCredits(Number(workspace?.credits_balance || 0));
          setForm(
            normalizeBranding({
              company_name: workspace?.company_name || workspace?.name,
              logo_url: workspace?.logo_url,
              brand_primary_color: workspace?.brand_primary_color,
              brand_secondary_color: workspace?.brand_secondary_color,
              report_footer_text: workspace?.report_footer_text,
            })
          );
        }
      } catch (loadError) {
        setError(loadError?.message || 'Falha ao carregar branding.');
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, [apiBaseUrl, workspaceId]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.company_name.trim()) {
      return 'Nome da empresa é obrigatório.';
    }
    if (!HEX_COLOR_REGEX.test(form.brand_primary_color)) {
      return 'Cor primária inválida. Use formato #RRGGBB.';
    }
    if (!HEX_COLOR_REGEX.test(form.brand_secondary_color)) {
      return 'Cor secundária inválida. Use formato #RRGGBB.';
    }
    return '';
  };

  const saveBranding = async () => {
    if (!canEditBranding) {
      setError('Sem créditos para editar a marca. Compre créditos para liberar o white-label.');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!workspaceId) {
      setError('Workspace não identificado.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        company_name: form.company_name.trim(),
        logo_url: form.logo_url.trim(),
        brand_primary_color: form.brand_primary_color.trim().toLowerCase(),
        brand_secondary_color: form.brand_secondary_color.trim().toLowerCase(),
        report_footer_text: form.report_footer_text.trim(),
      };

      if (apiBaseUrl) {
        const response = await apiRequest(`/branding/${workspaceId}`, {
          method: 'PUT',
          body: payload,
          requireAuth: true,
        });

        setForm(normalizeBranding(response));
      } else {
        await base44.entities.Workspace.update(workspaceId, payload);
        setForm(normalizeBranding(payload));
      }

      setSuccess('Identidade visual salva com sucesso.');
    } catch (saveError) {
      setError(saveError?.message || 'Falha ao salvar identidade visual.');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file) => {
    if (!canEditBranding) {
      setError('Sem créditos para editar a marca. Compre créditos para liberar o white-label.');
      return;
    }

    if (!file || !workspaceId) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      if (apiBaseUrl) {
        const formData = new FormData();
        formData.append('logo', file);

        const payload = await apiRequest(`/branding/${workspaceId}/logo`, {
          method: 'POST',
          body: formData,
          requireAuth: true,
        });

        setForm((prev) => normalizeBranding({ ...prev, logo_url: payload.logo_url }));
      } else {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
          reader.readAsDataURL(file);
        });

        await base44.entities.Workspace.update(workspaceId, { logo_url: dataUrl });
        setForm((prev) => normalizeBranding({ ...prev, logo_url: dataUrl }));
      }

      setSuccess('Logo atualizado com sucesso.');
    } catch (uploadError) {
      setError(uploadError?.message || 'Falha ao enviar logo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <section className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Configurações de Marca</h2>
        <p className="text-sm text-slate-500">
          Personalize o white-label do seu workspace para preview e PDF do relatório DISC.
        </p>
      </section>

      {!canEditBranding ? (
        <CreditPaywallCard
          title="White-label bloqueado por falta de créditos"
          description="Compre créditos para personalizar logo, cores e rodapé dos relatórios."
        />
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Identidade visual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-slate-500">Carregando branding...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nome da empresa</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
                    value={form.company_name}
                    onChange={(event) => setField('company_name', event.target.value)}
                    placeholder="Nome exibido no relatório"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Logo</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <ImageUp className="w-4 h-4" />
                      {uploading ? 'Enviando...' : 'Enviar logo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) uploadLogo(file);
                        }}
                      />
                    </label>
                    <input
                      className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-4 py-2.5"
                      value={form.logo_url}
                      onChange={(event) => setField('logo_url', event.target.value)}
                      placeholder="URL do logo"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Cor primária</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={HEX_COLOR_REGEX.test(form.brand_primary_color) ? form.brand_primary_color : '#0b1f3b'}
                        onChange={(event) => setField('brand_primary_color', event.target.value)}
                        className="h-10 w-12 rounded border border-slate-200"
                      />
                      <input
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5"
                        value={form.brand_primary_color}
                        onChange={(event) => setField('brand_primary_color', event.target.value)}
                        placeholder="#0b1f3b"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Cor secundária</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={HEX_COLOR_REGEX.test(form.brand_secondary_color) ? form.brand_secondary_color : '#f7b500'}
                        onChange={(event) => setField('brand_secondary_color', event.target.value)}
                        className="h-10 w-12 rounded border border-slate-200"
                      />
                      <input
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5"
                        value={form.brand_secondary_color}
                        onChange={(event) => setField('brand_secondary_color', event.target.value)}
                        placeholder="#f7b500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Texto do rodapé</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
                    value={form.report_footer_text}
                    onChange={(event) => setField('report_footer_text', event.target.value)}
                    placeholder="Texto exibido no rodapé do relatório"
                  />
                </div>

                <Button
                  onClick={saveBranding}
                  disabled={saving || uploading || !canEditBranding}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar identidade visual'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Preview de marca</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-2xl border p-5 space-y-4"
              style={{
                borderColor: form.brand_secondary_color,
                background: '#ffffff',
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: `${form.brand_primary_color}33` }}>
                <div className="flex items-center gap-3">
                  <img
                    src={form.logo_url || FALLBACK_BRANDING.logo_url}
                    alt={form.company_name}
                    className="w-12 h-12 rounded-lg object-contain border bg-white p-1"
                  />
                  <div>
                    <p className="text-lg font-bold" style={{ color: form.brand_primary_color }}>
                      {form.company_name || FALLBACK_BRANDING.company_name}
                    </p>
                    <p className="text-xs text-slate-500">Plataforma de Análise Comportamental</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 text-xs rounded-full px-3 py-1" style={{ background: `${form.brand_secondary_color}22`, color: form.brand_primary_color }}>
                  <Palette className="w-3.5 h-3.5" /> White-label ativo
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl p-3" style={{ background: `${form.brand_primary_color}12` }}>
                  <p className="font-semibold" style={{ color: form.brand_primary_color }}>Cor primária</p>
                  <p className="text-slate-600">{form.brand_primary_color}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: `${form.brand_secondary_color}22` }}>
                  <p className="font-semibold" style={{ color: form.brand_primary_color }}>Cor secundária</p>
                  <p className="text-slate-600">{form.brand_secondary_color}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                {form.report_footer_text || FALLBACK_BRANDING.report_footer_text}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
