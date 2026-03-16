import React from 'react';
import StatsCard from '@/components/ui/StatsCard';

export default function StatsGrid({ items = [] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {items.map((item) => (
        <StatsCard
          key={item.title}
          title={item.title}
          value={item.value}
          icon={item.icon}
          iconClassName={item.iconClassName}
          subtitle={item.subtitle}
          trend={item.trend}
          trendValue={item.trendValue}
        />
      ))}
    </div>
  );
}
