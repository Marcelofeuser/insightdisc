import React from 'react';
import { getStatusClassName, getStatusLabel } from '@/components/leads/lead-utils';

export default function LeadStatusBadge({ status = 'new' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
