import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const HOME_HASH_ITEMS = Object.freeze([
  { label: 'Plataforma', hash: '#plataforma' },
  { label: 'Para quem é', hash: '#publicos' },
  { label: 'Recursos', hash: '#recursos' },
  { label: 'Casos de uso', hash: '#casos' },
  { label: 'Planos', hash: '#planos' },
]);

export { HOME_HASH_ITEMS };

export default function MainNavigation({ goHomeHash }) {
  const location = useLocation();
  const isDossieActive = location.pathname === '/dossie' || location.pathname === '/dossie-comportamental';

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
        to="/dossie"
        className={`inline-flex h-9 items-center rounded-lg px-3 text-sm transition-colors ${
          isDossieActive
            ? 'bg-white/10 text-white border border-white/15'
            : 'text-slate-300 hover:text-white hover:bg-white/5'
        }`}
      >
        Dossiê
      </Link>
    </nav>
  );
}
