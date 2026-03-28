import React, { useMemo } from 'react';
import ProductSegmentLandingBase from '@/pages/ProductSegmentLandingBase';
import { buildPersonaLandingConfig } from '@/modules/marketing/unifiedLandingConfig';

export default function PersonaLandingPage({ content }) {
  const config = useMemo(() => buildPersonaLandingConfig(content), [content]);
  return <ProductSegmentLandingBase {...config} />;
}
