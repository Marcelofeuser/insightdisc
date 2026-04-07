import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PLAN_DROPDOWN_ITEMS, PRODUCT_TABS } from '@/modules/marketing/landingNavConfig';

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
  const isPlansActive = PLAN_DROPDOWN_ITEMS.some((item) => item.to === activePath) || activePath === '/planos';

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {HOME_HASH_ITEMS.map((item) => (
        <Button
          key={item.label}
          type="button"
          variant="ghost"
          className="h-10 rounded-xl px-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          onClick={() => goHomeHash(item.hash)}
        >
          {item.label}
        </Button>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors ${
              isPlansActive
                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Abrir planos"
          >
            Planos
            <ChevronDown className="h-4 w-4 opacity-90" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {PLAN_DROPDOWN_ITEMS.map((item) => (
            <DropdownMenuItem key={item.to} asChild className="cursor-pointer">
              <Link to={item.to} className="w-full">
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {PRODUCT_TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={`inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium transition-colors ${
            activePath === tab.to
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
