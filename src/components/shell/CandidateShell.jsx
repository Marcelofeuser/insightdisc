import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

export default function CandidateShell() {
  const location = useLocation();
  const inCandidateMode = location.pathname.startsWith('/c');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-slate-900">InsightDISC</div>
            <div className="text-xs text-slate-500 leading-tight">Plataforma de Análise Comportamental</div>
          </div>
          {inCandidateMode ? (
            <div className="text-xs text-slate-500">Acesso do respondente</div>
          ) : null}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-8 text-xs text-slate-400">
        Confidencial • Uso para desenvolvimento profissional
      </footer>
    </div>
  );
}
