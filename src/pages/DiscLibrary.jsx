import React from 'react';
import { BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function DiscLibrary() {
  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
            <BookOpen className="h-3.5 w-3.5" />
            Biblioteca DISC
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Biblioteca DISC</h1>
          <p className="mt-2 text-sm text-slate-600">
            Conteúdo de apoio para interpretação comportamental, aplicação prática e desenvolvimento contínuo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
