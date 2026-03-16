import React from 'react';
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
    </nav>
  );
}
