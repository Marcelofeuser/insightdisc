import { useEffect, useState } from 'react';
import { BrainCircuit, LogOut, Menu, Sparkles, X, Zap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import {
  buildSynapsysAppPath,
  buildSynapsysEntryPath,
  buildSynapsysPricingPath,
  buildSynapsysSignupPath,
} from '@/modules/synapsys/routes';
import { hasSynapsysAccess as hasSynapsysProductAccess } from '@/modules/synapsys/access';
import { markSynapsysRouteContext, resolveSynapsysTier } from '@/modules/synapsys/session';

const NAV_ITEMS = Object.freeze([
  { label: 'Entrada', to: buildSynapsysEntryPath() },
  { label: 'Chat', to: buildSynapsysEntryPath() },
  { label: 'Planos', to: buildSynapsysPricingPath({ plan: 'premium' }) },
]);

function SynapsysAmbientLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 12% 18%, rgba(50, 222, 255, 0.16), transparent 26%), radial-gradient(circle at 82% 14%, rgba(153, 91, 255, 0.16), transparent 26%), radial-gradient(circle at 50% 80%, rgba(26, 130, 255, 0.12), transparent 24%), linear-gradient(180deg, #02040b 0%, #040915 55%, #050913 100%)',
        }}
      />
      <div className="absolute left-[8%] top-24 h-48 w-48 rounded-full border border-cyan-300/12 bg-cyan-300/10 blur-3xl" />
      <div className="absolute right-[8%] top-32 h-64 w-64 rounded-full border border-violet-300/10 bg-violet-400/10 blur-3xl" />
      <div className="absolute bottom-[-4rem] left-1/3 h-80 w-80 rounded-full border border-sky-300/10 bg-sky-400/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent" />
    </div>
  );
}

function resolvePrimaryAction({ isAuthenticated, tier, hasSynapsysAccess }) {
  if (isAuthenticated && hasSynapsysAccess) {
    return {
      label: tier === 'premium' ? 'Abrir chat premium' : 'Abrir chat grátis',
      to: buildSynapsysAppPath({ plan: tier }),
    };
  }

  if (isAuthenticated) {
    return {
      label: 'Ativar acesso grátis',
      to: buildSynapsysSignupPath({
        intent: 'free',
        next: buildSynapsysAppPath({ plan: 'free' }),
      }),
    };
  }

  return {
    label: 'Entrar ou criar conta',
    to: buildSynapsysSignupPath({
      intent: 'free',
      next: buildSynapsysAppPath({ plan: 'free' }),
    }),
  };
}

export default function SynapsysSiteShell({ children, heroSlot = null, compact = false }) {
  const location = useLocation();
  const { isAuthenticated, access, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tier = resolveSynapsysTier(access);
  const hasSynapsysAccess = hasSynapsysProductAccess(access);
  const primaryAction = resolvePrimaryAction({ isAuthenticated, tier, hasSynapsysAccess });

  useEffect(() => {
    markSynapsysRouteContext();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02040b] text-white">
      <SynapsysAmbientLayer />

      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030713]/72 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link to={buildSynapsysEntryPath()} className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/12 bg-white/10 text-cyan-100 shadow-[0_0_45px_rgba(42,214,255,0.18)]">
                <BrainCircuit className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100/62">
                  Synapsys AI
                </span>
                <span className="mt-1 block text-sm text-white/60">
                  Inteligência viva, contexto e profundidade em fluxo próprio
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-2 lg:flex">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'border border-cyan-300/18 bg-cyan-300/10 text-cyan-100'
                        : 'text-white/64 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/70">
                <span className="inline-flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-cyan-100" />
                  {tier === 'premium'
                    ? 'Camada premium pronta'
                    : hasSynapsysAccess
                      ? 'Camada grátis com limite diário'
                      : 'Acesso Synapsys ainda não ativado'}
                </span>
              </div>

              <Link to={primaryAction.to}>
                <Button className="rounded-full bg-white text-slate-950 hover:bg-cyan-50">
                  {primaryAction.label}
                </Button>
              </Link>

              {isAuthenticated ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full border border-white/10 text-white/72 hover:bg-white/8 hover:text-white"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white lg:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileMenuOpen ? (
            <div className="border-t border-white/10 px-4 py-4 lg:hidden">
              <div className="space-y-2">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="block rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/80"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-4 grid gap-2">
                <Link to={primaryAction.to}>
                  <Button className="w-full rounded-2xl bg-white text-slate-950 hover:bg-cyan-50">
                    {primaryAction.label}
                  </Button>
                </Link>
                {isAuthenticated ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-2xl border border-white/10 text-white/72 hover:bg-white/8 hover:text-white"
                    onClick={() => logout()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                ) : (
                  <Link to={buildSynapsysSignupPath({ intent: 'free', next: buildSynapsysAppPath({ plan: 'free' }) })}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full rounded-2xl border border-white/10 text-white/72 hover:bg-white/8 hover:text-white"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Entrar ou criar conta
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </header>

        {heroSlot ? (
          <div className={compact ? 'px-4 pt-6 sm:px-6' : 'px-4 pt-8 sm:px-6 sm:pt-10'}>
            <div className="mx-auto max-w-7xl">{heroSlot}</div>
          </div>
        ) : null}

        <main className={compact ? 'px-4 pb-8 pt-6 sm:px-6 sm:pb-10' : 'px-4 pb-16 pt-8 sm:px-6 sm:pb-24'}>
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
