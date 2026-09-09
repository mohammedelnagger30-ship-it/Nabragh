import { Helmet } from 'react-helmet-async';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video';
  noIndex?: boolean;
}

export default function MetaTags({
  title = 'منصة العلم - تعلّم من أفضل المدرسين',
  description = 'منصة تعليمية متكاملة تتيح للمدرسين رفع فيديوهاتهم وللطلاب الوصول لمحتوى تعليمي متميز في جميع التخصصات',
  image = 'https://bolt.new/static/og_default.png',
  url = window.location.href,
  type = 'website',
  noIndex = false,
}: MetaTagsProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="ar_SA" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Additional SEO */}
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
