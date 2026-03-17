import React from 'react';
import { Users } from 'lucide-react';
import { DISC_FACTOR_COLORS, DISC_FACTOR_LABELS } from '@/modules/analytics/constants';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

const SAMPLE_MEMBERS = [
  { id: 'sample-1', name: 'Carlos', profileKey: 'DI', dominantFactor: 'D' },
  { id: 'sample-2', name: 'Ana', profileKey: 'SC', dominantFactor: 'S' },
  { id: 'sample-3', name: 'Pedro', profileKey: 'DC', dominantFactor: 'D' },
  { id: 'sample-4', name: 'Juliana', profileKey: 'IS', dominantFactor: 'I' },
];

function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR');
}

function resolveFactorFromProfile(profileKey = '') {
  const raw = String(profileKey || '').trim().toUpperCase();
  return raw[0] || '';
}

export default function TeamDiscMap({
  title = 'Mapa de perfis da equipe',
  subtitle = 'Composição comportamental recente do grupo avaliado.',
  members = [],
}) {
  const source = Array.isArray(members) && members.length ? members : SAMPLE_MEMBERS;
  const isSample = !members?.length;

  return (
    <PanelShell>
      <SectionHeader icon={Users} title={title} subtitle={subtitle} />

      {isSample ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Exemplo ilustrativo exibido. Conclua avaliações para visualizar a composição real da sua equipe.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {source.map((member, index) => {
          const profileKey = String(member?.profileKey || member?.dominantFactor || 'DISC').toUpperCase();
          const mainFactor = member?.dominantFactor || resolveFactorFromProfile(profileKey);
          const factorLabel = DISC_FACTOR_LABELS[mainFactor] || 'Perfil DISC';
          const accent = DISC_FACTOR_COLORS[mainFactor] || '#64748b';
          const dateLabel = formatDate(member?.date);

          return (
            <article key={member?.id || `${profileKey}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {String(member?.name || '?').trim().charAt(0).toUpperCase() || '?'}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{member?.name || 'Participante'}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Perfil <span className="font-semibold text-slate-800">{profileKey}</span>
                    {mainFactor ? ` • ${mainFactor} (${factorLabel})` : ''}
                  </p>
                  {dateLabel ? <p className="mt-1 text-xs text-slate-500">Última leitura: {dateLabel}</p> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </PanelShell>
  );
}
