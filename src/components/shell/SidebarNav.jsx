import React from 'react';
import { Link } from 'react-router-dom';

export default function SidebarNav({ items = [], currentPageName, onItemClick }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.page}
          to={item.to}
          onClick={onItemClick}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            currentPageName === item.page
              ? 'bg-indigo-50 text-indigo-600 font-medium'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
