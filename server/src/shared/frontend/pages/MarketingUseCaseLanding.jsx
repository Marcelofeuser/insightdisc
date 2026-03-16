import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import UseCaseLandingPage from '@/modules/marketing/pages/UseCaseLandingPage';
import { USE_CASE_CONTENT } from '@/modules/marketing/content/marketingContent';

const DEFAULT_USE_CASE = 'disc-para-empresas';

export default function MarketingUseCaseLanding() {
  const location = useLocation();
  const slug = location.pathname.replace('/', '').toLowerCase();

  const content = useMemo(() => {
    return USE_CASE_CONTENT[slug] || USE_CASE_CONTENT[DEFAULT_USE_CASE];
  }, [slug]);

  return <UseCaseLandingPage content={content} />;
}

