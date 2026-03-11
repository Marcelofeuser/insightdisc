import React from 'react';
import PersonaHero from '@/modules/marketing/sections/PersonaHero';
import PersonaPainPointsSection from '@/modules/marketing/sections/PersonaPainPointsSection';
import PersonaBenefitsSection from '@/modules/marketing/sections/PersonaBenefitsSection';
import ModuleHighlightsSection from '@/modules/marketing/sections/ModuleHighlightsSection';
import ReportLadderSection from '@/modules/marketing/sections/ReportLadderSection';
import CTASection from '@/modules/marketing/sections/CTASection';
import { useMarketingMeta } from '@/modules/marketing/useMarketingMeta';

export default function PersonaLandingPage({ content }) {
  useMarketingMeta({
    title: content.metaTitle,
    description: content.metaDescription,
  });

  return (
    <div className="marketing-surface min-h-screen bg-white text-slate-900">
      <PersonaHero content={content} />
      <PersonaPainPointsSection points={content.painPoints} />
      <PersonaBenefitsSection benefits={content.benefits} />
      <ReportLadderSection
        currentTier={content.reportTier || 'standard'}
        title="Escada de valor dos relatorios no seu contexto"
        description="Clareza total sobre o que cada nivel de relatorio entrega para sua jornada."
      />
      <ModuleHighlightsSection moduleKeys={content.modules} ctaTo="/demo" />
      <CTASection
        content={{
          title: 'Pronto para aplicar DISC com profundidade no seu contexto?',
          description:
            'Use uma plataforma unica para leitura individual, comparacao, relatorio premium e inteligencia comportamental aplicada.',
          primary: content.primaryCta,
          secondary: content.secondaryCta,
        }}
      />
    </div>
  );
}
