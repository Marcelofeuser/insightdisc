import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Coins, FileBarChart2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

const SUMMARY_CARDS = [
  {
    label: 'Empresas ativas',
    value: 'Visão consolidada',
    description: 'Acompanhe crescimento de contas e operação por cliente.',
    icon: Building2,
  },
  {
    label: 'Usuários da plataforma',
    value: 'Base total',
    description: 'Distribuição por papéis, ativação e retenção.',
    icon: Users,
  },
  {
    label: 'Avaliações DISC',
    value: 'Período atual',
    description: 'Envios, respostas e geração de relatórios em andamento.',
    icon: FileBarChart2,
  },
  {
    label: 'Créditos e receita',
    value: 'Indicadores comerciais',
    description: 'Consumo, distribuição promocional e ciclo de compra.',
    icon: Coins,
  },
];

function Card({ item }) {
  const Icon = item.icon;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{item.label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{item.value}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600">{item.description}</p>
    </article>
  );
}

export default function AdminDashboardV2() {
  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-6 py-8 space-y-8" data-testid="dashboard-admin-v2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Admin da Plataforma</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Controle executivo da operação InsightDISC</h2>
        <p className="mt-2 text-sm text-slate-600">
          Acompanhe saúde do negócio, uso da plataforma e decisões estratégicas em um painel único.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/super-admin">
            <Button className="bg-slate-900 hover:bg-slate-800">Abrir Super Admin</Button>
          </Link>
          <Link to={createPageUrl('AdminDashboard')}>
            <Button variant="outline">Admin Console</Button>
          </Link>
          <Link to={createPageUrl('LeadsDashboard')}>
            <Button variant="outline">Leads e comercial</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map((item) => (
          <Card key={item.label} item={item} />
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Atalhos operacionais</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link to={createPageUrl('MyAssessments')} className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <p className="font-medium text-slate-900">Relatórios recentes</p>
            <p className="mt-1 text-sm text-slate-600">Acompanhe geração de PDF e atividade recente.</p>
          </Link>
          <Link to={createPageUrl('Credits')} className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
            <p className="font-medium text-slate-900">Créditos e monetização</p>
            <p className="mt-1 text-sm text-slate-600">Visualize saldo, consumo e compras.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
