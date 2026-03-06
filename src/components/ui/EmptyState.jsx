import React from 'react';
import { Button } from '@/components/ui/button';

export default function EmptyState({ icon: Icon, title, description, ctaLabel, onCtaClick }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
      {Icon ? <Icon className="w-12 h-12 text-slate-300 mx-auto mb-4" /> : null}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description ? <p className="text-sm text-slate-500 mt-2">{description}</p> : null}
      {ctaLabel && onCtaClick ? (
        <Button onClick={onCtaClick} className="mt-6 bg-indigo-600 hover:bg-indigo-700">
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}
