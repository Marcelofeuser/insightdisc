import React from 'react';
import PersonaHero from '@/modules/marketing/sections/PersonaHero';
import ModuleHighlightsSection from '@/modules/marketing/sections/ModuleHighlightsSection';
import ComparisonTableSection from '@/modules/marketing/sections/ComparisonTableSection';
import ReportLadderSection from '@/modules/marketing/sections/ReportLadderSection';
import CTASection from '@/modules/marketing/sections/CTASection';
import { USE_CASE_COMMON_BLOCKS } from '@/modules/marketing/content/marketingContent';
import { useMarketingMeta } from '@/modules/marketing/useMarketingMeta';

const USE_CASE_MODULE_KEYS = Object.freeze(['result', 'comparison', 'jobFit', 'teamMap', 'reports']);

export default function UseCaseLandingPage({ content }) {
  useMarketingMeta({
    title: content.metaTitle,
    description: content.metaDescription,
  });

  const heroContent = {
    badge: content.badge,
    title: content.title,
    subtitle: content.subtitle,
    primaryCta: content.primaryCta,
    secondaryCta: content.secondaryCta,
  };

  return (
    <div className="marketing-surface min-h-screen bg-white text-slate-900">
      <PersonaHero content={heroContent} />
      <ReportLadderSection currentTier="standard" />
      <ModuleHighlightsSection moduleKeys={USE_CASE_MODULE_KEYS} ctaTo="/demo" />
      <ComparisonTableSection
        title={USE_CASE_COMMON_BLOCKS.comparisonTableTitle}
        rows={USE_CASE_COMMON_BLOCKS.comparisonRows}
      />
      <CTASection
        content={{
          title: 'Aplicar DISC com qualidade de produto e decisao',
          description:
            'Conecte perfil individual, comparacao, inteligencia de equipe e recomendacoes praticas em um fluxo unico.',
          primary: content.primaryCta,
          secondary: content.secondaryCta,
        }}
      />
    </div>
  );
}
