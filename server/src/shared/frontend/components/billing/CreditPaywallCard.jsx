import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function CreditPaywallCard({
  title = 'Recurso premium bloqueado',
  description = 'Compre créditos para liberar este recurso.',
  className = '',
}) {
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-100 text-amber-700 p-2">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">{title}</p>
          <p className="text-sm text-amber-800/90">{description}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link to={createPageUrl('Pricing')}>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Comprar créditos
          </Button>
        </Link>
        <Link to={createPageUrl('Pricing')}>
          <Button size="sm" variant="outline">
            Ver planos
          </Button>
        </Link>
      </div>
    </div>
  );
}
