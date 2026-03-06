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
  navItems,
  user,
  onLogout,
  title,
  subtitle,
  actions,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-xl font-bold text-slate-900">InsightDISC</div>
            <div className="text-xs text-slate-500">Plataforma de Análise Comportamental</div>
          </div>
        </div>

        <div className="flex-1 px-4 py-6">
          <SidebarNav items={navItems} currentPageName={currentPageName} />
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-sm font-medium text-indigo-600">{user?.full_name?.charAt(0) || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name || 'Usuário'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || '-'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start text-slate-600 hover:text-red-600 mt-2"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
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
          <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg p-4 space-y-2">
            <SidebarNav
              items={navItems}
              currentPageName={currentPageName}
              onItemClick={() => setIsMenuOpen(false)}
            />
            <Button variant="ghost" onClick={onLogout} className="w-full justify-start text-red-600 mt-2">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        ) : null}
      </header>

      <div className="lg:pl-64 pt-16 lg:pt-0 min-h-screen flex flex-col">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
