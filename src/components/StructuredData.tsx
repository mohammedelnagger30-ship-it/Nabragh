/* eslint-disable @typescript-eslint/no-explicit-any */
import { Helmet } from 'react-helmet-async';

interface StructuredDataProps {
  data: Record<string, any>;
}

export default function StructuredData({ data }: StructuredDataProps) {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data, null, 2)}
      </script>
    </Helmet>
  );
}

export function generateCourseStructuredData(course: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    provider: {
      '@type': 'Person',
      name: course.teacher?.full_name,
    },
    offers: {
      '@type': 'Offer',
      price: course.price,
      priceCurrency: 'SAR',
      availability: course.price === 0 ? 'https://schema.org/InStock' : 'https://schema.org/InStock',
    },
    inLanguage: 'ar-SA',
  };
}

export function generateVideoStructuredData(video: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnail_url,
    uploadDate: video.created_at,
    duration: video.duration ? `PT${video.duration}S` : undefined,
    author: {
      '@type': 'Person',
      name: video.teacher?.full_name,
    },
    inLanguage: 'ar-SA',
  };
}

export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'منصة العلم',
    url: 'https://manhatalilm.com',
    logo: 'https://manhatalilm.com/logo.png',
    description: 'منصة تعليمية متكاملة تتيح للمدرسين رفع فيديوهاتهم وللطلاب الوصول لمحتوى تعليمي متميز',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'SA',
      addressLocality: 'الرياض',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+966501234567',
      contactType: 'customer service',
      availableLanguage: 'Arabic',
    },
  };
}
