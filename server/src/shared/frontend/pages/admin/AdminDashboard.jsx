import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Building2, CreditCard, FileText, Users, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import AdminSectionShell from './AdminSectionShell.jsx';
import { fetchAdminOverview, formatCurrency } from './adminApi.js';

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

export default function AdminDashboard() {
  const query = useQuery({
    queryKey: ['admin-v2-overview'],
    queryFn: fetchAdminOverview,
  });

  const overview = query.data || {};
  const cards = [
    { icon: Users, label: 'Usuários', value: overview.usersTotal || 0 },
    { icon: FileText, label: 'Avaliações', value: overview.assessmentsTotal || 0 },
    { icon: Building2, label: 'Empresas', value: overview.workspacesTotal || 0 },
    { icon: Activity, label: 'Leads', value: overview.leadsTotal || 0 },
    { icon: CreditCard, label: 'Pagamentos', value: overview.paymentsApproved || 0 },
    { icon: Wallet, label: 'Receita', value: formatCurrency(overview.revenueTotal || 0) },
  ];

  return (
    <AdminSectionShell
      title="Admin Dashboard"
      subtitle="Visão consolidada da plataforma para operação SaaS, billing e crescimento."
      isLoading={query.isLoading}
      error={query.error?.message || ''}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} icon={card.icon} label={card.label} value={card.value} />
        ))}
      </section>
    </AdminSectionShell>
  );
}
