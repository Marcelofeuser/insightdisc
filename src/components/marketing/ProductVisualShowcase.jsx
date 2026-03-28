import React from 'react';

const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_COLORS = Object.freeze({
  D: '#f87171',
  I: '#fbbf24',
  S: '#4ade80',
  C: '#60a5fa',
});

function buildRadarPoints(values, scale = 1, center = 110, radius = 76) {
  return FACTORS.map((factor, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / FACTORS.length;
    const intensity = Math.max(0, Math.min(100, Number(values?.[factor] || 0)));
    const r = (intensity / 100) * radius * scale;
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function buildRadarGrid(level, center = 110, radius = 76) {
  const ratio = Math.max(0, Math.min(100, level)) / 100;
  return FACTORS.map((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / FACTORS.length;
    const x = center + Math.cos(angle) * radius * ratio;
    const y = center + Math.sin(angle) * radius * ratio;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function DiscRadar({ title, subtitle, values }) {
  const polygon = buildRadarPoints(values);

  return (
    <div className="scroll-reveal dossie-card disc-visual-card glass-card rounded-3xl p-6 md:p-7">
      <p className="text-xs uppercase tracking-[0.14em] text-blue-300 mb-2">{title}</p>
      <p className="text-slate-400 text-sm mb-5">{subtitle}</p>
      <div className="grid md:grid-cols-[230px_1fr] gap-4 items-center">
        <svg viewBox="0 0 220 220" className="w-full max-w-[230px] mx-auto">
          {[25, 50, 75, 100].map((level) => (
            <polygon
              key={level}
              points={buildRadarGrid(level)}
              fill="none"
              stroke="rgba(148,163,184,0.28)"
              strokeWidth="1"
            />
          ))}
          {FACTORS.map((factor, index) => {
            const angle = -Math.PI / 2 + (index * Math.PI * 2) / FACTORS.length;
            const x = 110 + Math.cos(angle) * 88;
            const y = 110 + Math.sin(angle) * 88;
            return (
              <g key={factor}>
                <line x1="110" y1="110" x2={x} y2={y} stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
                <text
                  x={110 + Math.cos(angle) * 100}
                  y={110 + Math.sin(angle) * 100}
                  fill={FACTOR_COLORS[factor]}
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {factor}
                </text>
              </g>
            );
          })}
          <polygon points={polygon} fill="rgba(59,130,246,0.18)" stroke="rgba(96,165,250,0.85)" strokeWidth="2" />
        </svg>
        <div className="grid grid-cols-2 gap-3">
          {FACTORS.map((factor) => (
            <div key={factor} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Fator {factor}</p>
              <p className="text-lg font-bold mt-1" style={{ color: FACTOR_COLORS[factor] }}>
                {Math.round(Number(values?.[factor] || 0))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiscBars({ title, values }) {
  return (
    <div className="scroll-reveal dossie-card disc-visual-card glass-card rounded-3xl p-6 md:p-7">
      <p className="text-xs uppercase tracking-[0.14em] text-blue-300 mb-4">{title}</p>
      <div className="space-y-4">
        {FACTORS.map((factor, index) => {
          const score = Math.max(0, Math.min(100, Number(values?.[factor] || 0)));
          return (
            <div key={factor} className="scroll-reveal" style={{ animationDelay: `${index * 0.06}s` }}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span style={{ color: FACTOR_COLORS[factor] }} className="font-semibold">{factor}</span>
                <span className="text-slate-300">{score}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${score}%`,
                    background: `linear-gradient(90deg, ${FACTOR_COLORS[factor]}99 0%, ${FACTOR_COLORS[factor]} 100%)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportPreview({ title, badge, lines }) {
  return (
    <div className="scroll-reveal dossie-card disc-visual-card glass-card rounded-3xl p-6 md:p-7">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs uppercase tracking-[0.14em] text-blue-300">{title}</p>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/25 text-blue-100">{badge}</span>
      </div>
      <div className="space-y-3">
        {lines.map((line, index) => (
          <div key={line} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
            <p className="text-sm text-slate-300 leading-relaxed">
              <span className="text-slate-500 mr-2">{String(index + 1).padStart(2, '0')}</span>
              {line}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCards({ cards }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {cards.map((item, index) => (
        <div key={item.title} className="scroll-reveal dossie-card disc-visual-card glass-card rounded-2xl p-5" style={{ animationDelay: `${index * 0.07}s` }}>
          <p className="text-xs uppercase tracking-[0.1em] text-slate-500 mb-2">{item.title}</p>
          <p className="text-slate-200 leading-relaxed text-sm">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

function TechnicalReadBlock({ title, bullets }) {
  return (
    <div className="scroll-reveal dossie-card disc-visual-card glass-card rounded-3xl p-6 md:p-7">
      <p className="text-xs uppercase tracking-[0.14em] text-blue-300 mb-4">{title}</p>
      <div className="grid gap-2">
        {bullets.map((bullet, index) => (
          <div key={bullet} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-slate-300 text-sm" style={{ animationDelay: `${index * 0.05}s` }}>
            {bullet}
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamMapCard({ title, members }) {
  return (
    <div className="scroll-reveal dossie-card disc-visual-card glass-card rounded-3xl p-6 md:p-7">
      <p className="text-xs uppercase tracking-[0.14em] text-blue-300 mb-4">{title}</p>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {members.map((factor, index) => (
          <div
            key={`${factor}-${index}`}
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border border-white/15"
            style={{
              backgroundColor: `${FACTOR_COLORS[factor]}22`,
              color: FACTOR_COLORS[factor],
            }}
          >
            {factor}
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowPipeline({ title, stages }) {
  return (
    <div className="scroll-reveal dossie-card disc-visual-card glass-card rounded-3xl p-6 md:p-7">
      <p className="text-xs uppercase tracking-[0.14em] text-blue-300 mb-4">{title}</p>
      <div className="grid md:grid-cols-3 gap-3">
        {stages.map((stage, index) => (
          <div key={stage.title} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 mb-2">{`Etapa ${index + 1}`}</p>
            <p className="text-sm font-semibold text-slate-100 mb-1.5">{stage.title}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{stage.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NarrativeBlock({ eyebrow, title, description, bullets = [] }) {
  return (
    <div className="scroll-reveal dossie-card glass-card rounded-3xl p-6 md:p-7 h-full">
      <p className="text-xs uppercase tracking-[0.14em] text-blue-300 mb-3">{eyebrow}</p>
      <h3 className="text-2xl font-extrabold leading-tight mb-3">{title}</h3>
      <p className="text-slate-300 leading-relaxed mb-4">{description}</p>
      {bullets.length ? (
        <div className="grid gap-2">
          {bullets.map((bullet) => (
            <div key={bullet} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-300">
              {bullet}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VisualNarrativeRow({ visual, reverse, eyebrow, title, description, bullets }) {
  return (
    <article className="grid lg:grid-cols-2 gap-6 items-stretch">
      <div className={reverse ? 'lg:order-2' : ''}>
        {visual}
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>
        <NarrativeBlock
          eyebrow={eyebrow}
          title={title}
          description={description}
          bullets={bullets}
        />
      </div>
    </article>
  );
}

export default function ProductVisualShowcase({ eyebrow, title, description, variant, content }) {
  const guidedRows = (() => {
    if (variant === 'personal') {
      return [
        {
          visual: <DiscRadar title={content.radar.title} subtitle={content.radar.subtitle} values={content.radar.values} />,
          eyebrow: 'Leitura de perfil',
          title: content.radar.title,
          description: 'O radar traduz a intensidade dos fatores DISC e facilita uma leitura imediata do padrão comportamental predominante.',
          bullets: ['Visão clara de forças naturais', 'Base para decisões mais conscientes'],
        },
        {
          visual: <ReportPreview title={content.preview.title} badge={content.preview.badge} lines={content.preview.lines} />,
          eyebrow: 'Preview do relatório',
          title: content.preview.title,
          description: 'A estrutura do relatório organiza os principais pontos de interpretação com linguagem simples e aplicável.',
          bullets: ['Leitura acessível', 'Direcionamentos práticos'],
          reverse: true,
        },
        {
          visual: <InsightCards cards={content.insights} />,
          eyebrow: 'Insights acionáveis',
          title: 'Resumo visual para evolução pessoal',
          description: 'Os cards destacam comunicação, decisão e foco de desenvolvimento para transformar percepção em ação.',
          bullets: content.insights.map((item) => item.title),
        },
      ];
    }

    if (variant === 'profissional') {
      return [
        {
          visual: <DiscRadar title={content.radar.title} subtitle={content.radar.subtitle} values={content.radar.values} />,
          eyebrow: 'Radar técnico',
          title: content.radar.title,
          description: 'A leitura radial permite mapear predominância e combinações com precisão para decisões profissionais.',
          bullets: ['Base para devolutiva estruturada', 'Visão rápida de intensidade comportamental'],
        },
        {
          visual: <DiscBars title={content.bars.title} values={content.bars.values} />,
          eyebrow: 'Intensidade D/I/S/C',
          title: content.bars.title,
          description: 'As barras facilitam comparação direta entre fatores para validar hipóteses técnicas e reduzir subjetividade.',
          bullets: ['Comparação objetiva entre fatores', 'Leitura clara para contexto de RH e consultoria'],
          reverse: true,
        },
        {
          visual: <ReportPreview title={content.preview.title} badge={content.preview.badge} lines={content.preview.lines} />,
          eyebrow: 'Relatório profissional',
          title: content.technical.title,
          description: 'O dossiê consolida evidências comportamentais e organiza o raciocínio analítico para devolutivas consistentes.',
          bullets: content.technical.bullets,
        },
      ];
    }

    if (variant === 'business') {
      return [
        {
          visual: <TeamMapCard title={content.teamMap.title} members={content.teamMap.members} />,
          eyebrow: 'Composição de equipe',
          title: content.teamMap.title,
          description: 'O Team Map mostra distribuição de perfis e ajuda a identificar equilíbrio, lacunas e riscos na dinâmica coletiva.',
          bullets: ['Visão organizacional imediata', 'Apoio à liderança e alocação'],
        },
        {
          visual: <DiscBars title={content.bars.title} values={content.bars.values} />,
          eyebrow: 'Distribuição consolidada',
          title: content.bars.title,
          description: 'A distribuição DISC da equipe direciona decisões sobre comunicação, gestão de conflitos e produtividade.',
          bullets: ['Leitura comparativa por fator', 'Suporte para decisões de gestão'],
          reverse: true,
        },
        {
          visual: <DiscRadar title={content.radar.title} subtitle={content.radar.subtitle} values={content.radar.values} />,
          eyebrow: 'Insight médio da equipe',
          title: content.radar.title,
          description: 'O radar médio resume tendências coletivas e complementa os insights estratégicos da operação.',
          bullets: content.insights.map((item) => item.title),
        },
      ];
    }

    if (variant === 'dossie') {
      return [
        {
          visual: <DiscRadar title={content.radar.title} subtitle={content.radar.subtitle} values={content.radar.values} />,
          eyebrow: 'Entrada analítica',
          title: content.radar.title,
          description: 'O radar inaugura a leitura técnica do perfil e prepara a interpretação dos blocos comportamentais.',
          bullets: ['Visão inicial da intensidade DISC', 'Base para leitura cruzada dos fatores'],
        },
        {
          visual: <TechnicalReadBlock title={content.reportStructure.title} bullets={content.reportStructure.bullets} />,
          eyebrow: 'Estrutura do dossiê',
          title: content.reportStructure.title,
          description: 'A organização por blocos facilita consistência na análise e apoia decisões profissionais com mais confiabilidade.',
          bullets: ['Menos ruído interpretativo', 'Mais padronização em devolutivas'],
          reverse: true,
        },
        {
          visual: <FlowPipeline title={content.flow.title} stages={content.flow.stages} />,
          eyebrow: 'Fluxo guiado',
          title: content.flow.title,
          description: 'Da entrada à saída, o fluxo visual conecta dados, análise e aplicação prática em atendimento.',
          bullets: ['Entrada estruturada', 'Análise técnica', 'Saída orientada à decisão'],
        },
      ];
    }

    return [];
  })();

  return (
    <section className="py-24 px-6 border-y border-white/5 bg-slate-900/35">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12 scroll-reveal">
          <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">{eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">{title}</h2>
          <p className="text-lg text-slate-400 leading-relaxed">{description}</p>
        </div>

        <div className="grid gap-6">
          {guidedRows.map((row, index) => (
            <VisualNarrativeRow
              key={`${variant}-${index}-${row.title}`}
              visual={row.visual}
              reverse={row.reverse}
              eyebrow={row.eyebrow}
              title={row.title}
              description={row.description}
              bullets={row.bullets}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
