import React from 'react';
import LandingHero from '@/modules/marketing/sections/LandingHero';
import ProductShowcaseSection from '@/modules/marketing/sections/ProductShowcaseSection';
import ReportLadderSection from '@/modules/marketing/sections/ReportLadderSection';
import CoreFlowsSection from '@/modules/marketing/sections/CoreFlowsSection';
import FeatureGridSection from '@/modules/marketing/sections/FeatureGridSection';
import AudienceCardsSection from '@/modules/marketing/sections/AudienceCardsSection';
import UseCasesSection from '@/modules/marketing/sections/UseCasesSection';
import PricingSection from '@/modules/marketing/sections/PricingSection';
import FAQSection from '@/modules/marketing/sections/FAQSection';
import CTASection from '@/modules/marketing/sections/CTASection';
import SocialProofSection from '@/modules/marketing/sections/SocialProofSection';
import { MAIN_LANDING_CONTENT } from '@/modules/marketing/content/marketingContent';
import { useMarketingMeta } from '@/modules/marketing/useMarketingMeta';

export default function MainLandingPage() {
  useMarketingMeta({
    title: MAIN_LANDING_CONTENT.meta.title,
    description: MAIN_LANDING_CONTENT.meta.description,
  });

  return (
    <div className="marketing-surface min-h-screen bg-white text-slate-900">
      <LandingHero content={MAIN_LANDING_CONTENT.hero} />
      <ProductShowcaseSection items={MAIN_LANDING_CONTENT.productShowcase} />
      <ReportLadderSection currentTier="standard" />
      <CoreFlowsSection flows={MAIN_LANDING_CONTENT.coreFlows} />
      <FeatureGridSection
        eyebrow="Pilares de valor"
        title="Inteligencia comportamental para decisao em pessoas"
        description="A camada de produto conecta leitura individual, comparacao e inteligencia de equipe em um unico fluxo."
        items={MAIN_LANDING_CONTENT.valuePillars}
      />
      <AudienceCardsSection items={MAIN_LANDING_CONTENT.audiences} />
      <FeatureGridSection
        eyebrow="Diferenciais"
        title="Por que o InsightDISC e superior a um DISC simples"
        description="Entrega semantica estruturada, visual premium e aplicacao real para lideranca, recrutamento e desenvolvimento."
        items={MAIN_LANDING_CONTENT.differentials}
      />
      <SocialProofSection />
      <UseCasesSection items={MAIN_LANDING_CONTENT.useCases} />
      <PricingSection plans={MAIN_LANDING_CONTENT.plans} />
      <FAQSection faq={MAIN_LANDING_CONTENT.faq} />
      <CTASection content={MAIN_LANDING_CONTENT.finalCta} />
    </div>
  );
}
