import React from 'react';
import { Link } from 'react-router-dom';

const MENU_ITEMS = [
  { label: 'Início', path: '/' },
  { label: 'Avaliações', path: '/avaliacoes' },
  { label: 'Relatórios', path: '/r/demo' },
  { label: 'Dossiê Comportamental', path: '/dossie-comportamental' },
  { label: 'Planos', path: '/Pricing' },
];

export default function MainNavigation() {
  return (
    <nav className="hidden md:flex items-center gap-6">
      {MENU_ITEMS.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className="text-slate-600 hover:text-slate-900 transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
