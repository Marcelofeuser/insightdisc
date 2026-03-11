import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Menu, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SidebarNav from '@/components/shell/SidebarNav';
import Topbar from '@/components/shell/Topbar';
import { createPageUrl } from '@/utils';

export default function AppShell({
  children,
  currentPageName,
  currentPath,
  navItems,
  user,
  onLogout,
  title,
  subtitle,
  actions,
  modeLabel,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden md:flex md:min-h-screen md:w-72 md:shrink-0 md:flex-col md:border-r md:border-slate-200 md:bg-gradient-to-b md:from-white md:to-slate-50/80">
        <div className="border-b border-slate-200 px-5 py-5">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-slate-900">InsightDISC</p>
              <p className="truncate text-xs text-slate-500">Plataforma de Análise Comportamental</p>
            </div>
          </Link>
          {modeLabel ? (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-indigo-700">Modo atual</p>
              <p className="mt-0.5 text-sm font-semibold text-indigo-900">{modeLabel}</p>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarNav items={navItems} currentPageName={currentPageName} currentPath={currentPath} />
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="truncate text-sm font-medium text-slate-900">
              {user?.full_name || user?.name || 'Usuário'}
            </p>
            <p className="truncate text-xs text-slate-500">
              {user?.email || 'sem-email@insightdisc.app'}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={onLogout}
            title={user?.full_name ? `Sair (${user.full_name})` : 'Sair'}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">InsightDISC</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen((prev) => !prev)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {isMenuOpen ? (
          <div className="absolute top-full left-0 right-0 max-h-[70vh] overflow-y-auto border-b border-slate-200 bg-white p-4 shadow-lg">
            {modeLabel ? (
              <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">Modo atual</p>
                <p className="text-sm font-semibold text-indigo-900">{modeLabel}</p>
              </div>
            ) : null}
            <SidebarNav
              items={navItems}
              currentPageName={currentPageName}
              currentPath={currentPath}
              onItemClick={() => setIsMenuOpen(false)}
            />
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="truncate text-sm font-medium text-slate-900">
                {user?.full_name || user?.name || 'Usuário'}
              </p>
              <p className="mb-2 truncate text-xs text-slate-500">
                {user?.email || 'sem-email@insightdisc.app'}
              </p>
              <Button variant="outline" onClick={onLogout} className="w-full justify-start text-slate-700">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pt-16 md:pt-0">
        <Topbar title={title} subtitle={subtitle} actions={actions} modeLabel={modeLabel} />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
