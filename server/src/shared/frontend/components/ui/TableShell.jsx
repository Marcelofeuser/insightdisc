import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function TableShell({ title, description, controls, children, className = '' }) {
  return (
    <Card className={cn('rounded-2xl border-slate-200 shadow-sm', className)}>
      <CardHeader className="space-y-3 border-b border-slate-100 pb-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">{title}</CardTitle>
            {description ? <p className="mt-1.5 max-w-3xl text-sm text-slate-500">{description}</p> : null}
          </div>
          {controls ? (
            <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2 xl:w-auto xl:justify-end">
              {controls}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}
