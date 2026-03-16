import React from 'react';
import { NavLink } from 'react-router-dom';
import PanelState from '@/components/ui/PanelState';

const ADMIN_LINKS = Object.freeze([
  { to: '/admin', label: 'Visão Geral' },
  { to: '/admin/users', label: 'Usuários' },
  { to: '/admin/companies', label: 'Empresas' },
  { to: '/admin/assessments', label: 'Avaliações' },
  { to: '/admin/billing', label: 'Billing' },
]);

function LinkItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/admin'}
      className={({ isActive }) =>
        [
          'inline-flex rounded-lg px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-200 hover:text-indigo-700',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  );
}

export default function AdminSectionShell({
  title = '',
  subtitle = '',
  isLoading = false,
  error = '',
  children,
}) {
  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-4 sm:px-6 sm:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {ADMIN_LINKS.map((item) => (
            <LinkItem key={item.to} to={item.to} label={item.label} />
          ))}
        </div>
      </section>

      {isLoading ? (
        <PanelState
          type="loading"
          title="Carregando administração"
          description="Consolidando indicadores e dados operacionais da plataforma."
        />
      ) : null}

      {!isLoading && error ? (
        <PanelState
          type="error"
          title="Falha ao carregar dados administrativos"
          description={error || 'Tente novamente em alguns instantes.'}
        />
      ) : null}

      {!isLoading && !error ? children : null}
    </div>
  );
}
