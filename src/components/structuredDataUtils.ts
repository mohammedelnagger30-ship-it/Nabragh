/* eslint-disable @typescript-eslint/no-explicit-any */

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
      availability: 'https://schema.org/InStock',
    },
    inLanguage: 'ar-EG',
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
    duration: video.duration_seconds ? `PT${video.duration_seconds}S` : undefined,
    author: {
      '@type': 'Person',
      name: video.teacher?.full_name,
    },
    inLanguage: 'ar-EG',
  };
}

export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Noona',
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
