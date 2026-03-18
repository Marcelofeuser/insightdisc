import React from 'react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';
import { cn } from '@/lib/utils';

export default function ReportSection({
  id,
  icon,
  title,
  subtitle,
  tone = 'default',
  className,
  children,
}) {
  return (
    <PanelShell id={id} tone={tone} className={cn('scroll-mt-24', className)}>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      <div className="mt-4">{children}</div>
    </PanelShell>
  );
}
