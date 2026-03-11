import React from 'react';
import { Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600">
      <span className="font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function TeamFiltersBar({
  searchTerm,
  onSearchTermChange,
  filters,
  onFiltersChange,
  options,
  filteredCount,
}) {
  const factorOptions = [
    { value: 'all', label: 'Todos os fatores' },
    ...(options?.dominantFactors || []).map((factor) => ({
      value: factor,
      label: `${factor}`,
    })),
  ];

  const dynamicOptions = (items = [], emptyLabel = 'Sem dados') => [
    { value: 'all', label: 'Todos' },
    ...(items.length
      ? items.map((value) => ({ value, label: value }))
      : [{ value: '__none__', label: emptyLabel }]),
  ];

  const periodOptions = options?.periods || [{ value: 'all', label: 'Todo período' }];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Filter className="h-4 w-4 text-indigo-600" />
          Filtros e segmentação
        </p>
        <Badge variant="outline">Resultados: {filteredCount}</Badge>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <label className="flex flex-col gap-1 text-xs text-slate-600 xl:col-span-2">
          <span className="font-semibold uppercase tracking-[0.08em] text-slate-500">Busca</span>
          <Input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Nome, e-mail, perfil ou fator"
            className="h-10 border-slate-200"
          />
        </label>

        <SelectField
          label="Período"
          value={filters?.period || 'all'}
          onChange={(value) => onFiltersChange({ period: value })}
          options={periodOptions}
        />

        <SelectField
          label="Fator"
          value={filters?.dominantFactor || 'all'}
          onChange={(value) => onFiltersChange({ dominantFactor: value })}
          options={factorOptions}
        />

        <SelectField
          label="Departamento"
          value={filters?.department || 'all'}
          onChange={(value) => onFiltersChange({ department: value === '__none__' ? 'all' : value })}
          options={dynamicOptions(options?.departments || [])}
        />

        <SelectField
          label="Cargo"
          value={filters?.role || 'all'}
          onChange={(value) => onFiltersChange({ role: value === '__none__' ? 'all' : value })}
          options={dynamicOptions(options?.roles || [])}
        />

        <SelectField
          label="Gestor"
          value={filters?.manager || 'all'}
          onChange={(value) => onFiltersChange({ manager: value === '__none__' ? 'all' : value })}
          options={dynamicOptions(options?.managers || [])}
        />

        <SelectField
          label="Cidade"
          value={filters?.city || 'all'}
          onChange={(value) => onFiltersChange({ city: value === '__none__' ? 'all' : value })}
          options={dynamicOptions(options?.cities || [])}
        />
      </div>
    </div>
  );
}
