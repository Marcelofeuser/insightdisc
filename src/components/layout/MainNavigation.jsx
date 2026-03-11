import React from 'react';
import { Link } from 'react-router-dom';
import { MARKETING_MENU_ITEMS } from '@/modules/marketing/content/marketingContent';

export default function MainNavigation() {
  return (
    <nav className="hidden md:flex items-center gap-5">
      {MARKETING_MENU_ITEMS.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
