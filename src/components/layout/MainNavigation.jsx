import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PRODUCT_TABS } from '@/modules/marketing/landingNavConfig';

const HOME_HASH_ITEMS = Object.freeze([
  { label: 'Plataforma', hash: '#plataforma' },
  { label: 'Para quem é', hash: '#publicos' },
  { label: 'Recursos', hash: '#recursos' },
  { label: 'Casos de uso', hash: '#casos' },
]);

export { HOME_HASH_ITEMS };

export default function MainNavigation({ goHomeHash }) {
  const location = useLocation();
  const activePath = location.pathname === '/dossie-comportamental' ? '/dossie' : location.pathname;

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {HOME_HASH_ITEMS.map((item) => (
        <Button
          key={item.label}
          type="button"
          variant="ghost"
          className="h-9 rounded-lg px-3 text-sm text-slate-300 hover:text-white hover:bg-white/5"
          onClick={() => goHomeHash(item.hash)}
        >
          {item.label}
        </Button>
      ))}
      <Link
        to="/planos"
        className={`inline-flex h-9 items-center rounded-lg px-3 text-sm transition-colors border ${
          activePath === '/planos'
            ? 'text-amber-100 border-amber-300/50 bg-amber-400/18 shadow-[0_8px_20px_rgba(245,158,11,0.15)]'
            : 'text-amber-200 border-amber-300/30 bg-amber-400/10 hover:bg-amber-400/16'
        }`}
      >
        Planos
      </Link>
      {PRODUCT_TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={`inline-flex h-9 items-center rounded-lg px-3 text-sm transition-colors ${
            activePath === tab.to
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
