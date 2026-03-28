import React, { useMemo } from 'react';
import ProductSegmentLandingBase from '@/pages/ProductSegmentLandingBase';
import { buildUseCaseLandingConfig } from '@/modules/marketing/unifiedLandingConfig';

export default function UseCaseLandingPage({ content }) {
  const config = useMemo(() => buildUseCaseLandingConfig(content), [content]);
  return <ProductSegmentLandingBase {...config} />;
}
