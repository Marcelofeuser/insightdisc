import React from 'react';
import { Link } from 'react-router-dom';

function normalizePath(value = '') {
  const path = String(value || '').trim();
  if (!path) return '/';
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function isItemActive(item, currentPageName, currentPath, activeItemKey) {
  if (activeItemKey && item.key === activeItemKey) return true;
  if (item.page && currentPageName && item.page === currentPageName) return true;

  const itemPath = normalizePath(item.to || '/');
  const pagePath = normalizePath(currentPath || '/');
  if (itemPath === pagePath) return true;
  if (itemPath !== '/' && pagePath.startsWith(`${itemPath}/`)) return true;
  return false;
}

export default function SidebarNav({ items = [], currentPageName, currentPath, onItemClick }) {
  const normalizedItems = (Array.isArray(items) ? items : []).map((item, index) => ({
    ...item,
    section: item?.section || 'Navegação',
    key: item?.key || `${item?.section || 'nav'}-${item?.to || item?.page || index}`,
  }));

  const firstPathMatch = normalizedItems.find((item) => {
    const itemPath = normalizePath(item.to || '/');
    const pagePath = normalizePath(currentPath || '/');
    return itemPath === pagePath;
  });

  const groupedItems = normalizedItems.reduce((acc, item) => {
    const section = item.section || 'Navegação';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  const sections = Object.entries(groupedItems);

  return (
    <nav className="space-y-5">
      {sections.map(([section, sectionItems]) => (
        <section key={section} className="space-y-1.5">
          <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {section}
          </p>

          {sectionItems.map((item) => {
            const active = isItemActive(item, currentPageName, currentPath, firstPathMatch?.key);
            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={onItemClick}
                className={`group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <span
                  className={`absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full transition ${
                    active ? 'bg-indigo-500' : 'bg-transparent'
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    active
                      ? 'bg-white text-indigo-700'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                </span>

                <span className={active ? 'font-semibold' : 'font-medium'}>{item.label}</span>
              </Link>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
