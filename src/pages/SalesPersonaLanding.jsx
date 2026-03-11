import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import PersonaLandingPage from '@/modules/marketing/pages/PersonaLandingPage';
import { PERSONA_CONTENT } from '@/modules/marketing/content/marketingContent';

export default function SalesPersonaLanding() {
  const location = useLocation();
  const slug = location.pathname.replace('/', '').toLowerCase();

  const content = useMemo(() => {
    return PERSONA_CONTENT[slug] || PERSONA_CONTENT.empresa;
  }, [slug]);

  return <PersonaLandingPage content={content} />;
}
