"use client"

import { DefaultSeo } from 'next-seo';
import SEO from '../../lib/seo-config';

export default function SeoWrapper() {
  return <DefaultSeo {...SEO} />;
} 