import React, { useEffect } from 'react';
import LandingHero from '@/modules/marketing/sections/LandingHero';
import FeatureGridSection from '@/modules/marketing/sections/FeatureGridSection';
import AudienceCardsSection from '@/modules/marketing/sections/AudienceCardsSection';
import UseCasesSection from '@/modules/marketing/sections/UseCasesSection';
import PricingSection from '@/modules/marketing/sections/PricingSection';
import FAQSection from '@/modules/marketing/sections/FAQSection';
import CTASection from '@/modules/marketing/sections/CTASection';
import ComparisonTableSection from '@/modules/marketing/sections/ComparisonTableSection';
import { MAIN_LANDING_CONTENT } from '@/modules/marketing/content/marketingContent';
import { useMarketingMeta } from '@/modules/marketing/useMarketingMeta';

export default function MainLandingPage() {
  useMarketingMeta({
    title: MAIN_LANDING_CONTENT.meta.title,
    description: MAIN_LANDING_CONTENT.meta.description,
  });

  useEffect(() => {
    const revealTargets = document.querySelectorAll('.scroll-reveal');
    if (!revealTargets.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px',
      }
    );

    revealTargets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="marketing-surface min-h-screen">
      <LandingHero content={MAIN_LANDING_CONTENT.hero} />
      <FeatureGridSection
        id="plataforma"
        title="Tudo o que você precisa para aplicar DISC na prática"
        description="Da leitura individual ao recrutamento, da liderança à composição de equipes."
        items={MAIN_LANDING_CONTENT.valuePillars}
      />
      <AudienceCardsSection items={MAIN_LANDING_CONTENT.audiences} />
      <FeatureGridSection
        id="recursos"
        title="Por que a InsightDISC não é só mais um teste DISC"
        description="Porque ela transforma perfil em decisão prática."
        items={MAIN_LANDING_CONTENT.differentials}
      />
      <UseCasesSection items={MAIN_LANDING_CONTENT.useCases} />
      <ComparisonTableSection
        title={MAIN_LANDING_CONTENT.comparison.title}
        rows={MAIN_LANDING_CONTENT.comparison.rows}
      />
      <PricingSection plans={MAIN_LANDING_CONTENT.plans} />
      <FAQSection faq={MAIN_LANDING_CONTENT.faq} />
      <CTASection content={MAIN_LANDING_CONTENT.finalCta} />
    </div>
  );
}
