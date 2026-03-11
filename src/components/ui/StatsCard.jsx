import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  className,
  iconClassName 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">{title}</p>
          <p className="truncate text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="line-clamp-2 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn(
            "rounded-xl bg-slate-100 p-3 shadow-sm",
            iconClassName
          )}>
            <Icon className="w-6 h-6 text-slate-600" />
          </div>
        )}
      </div>
      
      {trend && (
        <div className={cn(
          "mt-4 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        )}>
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{trendValue}</span>
        </div>
      )}
    </motion.div>
  );
}
