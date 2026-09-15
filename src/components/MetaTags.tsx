import { Helmet } from 'react-helmet-async';

interface MetaTagsProps {
  title: string;
  description?: string;
  noIndex?: boolean;
  image?: string;
  type?: 'website' | 'article' | 'video' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

export default function MetaTags({ 
  title, 
  description = 'منصة تعليمية عربية تساعد الطلاب على التعلم من مدرسين موثوقين.', 
  noIndex = false,
  image = '/icon.svg',
  type = 'website',
  publishedTime,
  modifiedTime,
  author
}: MetaTagsProps) {
  const siteName = 'Noona';
  const fullTitle = `${title} | ${siteName}`;
  const url = window.location.href;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Article specific */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Structured Data placeholder */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': type === 'article' ? 'Article' : 'WebSite',
          name: title,
          description,
          url,
          image,
          inLanguage: 'ar-SA',
        })}
      </script>
    </Helmet>
  );
}
