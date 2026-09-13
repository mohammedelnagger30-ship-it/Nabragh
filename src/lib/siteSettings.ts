import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const SITE_SETTINGS_DEFAULTS: Record<string, any> = {
  site_name: 'منصة العلم',
  site_tagline: 'منصة تعليمية عربية تجمع الطلاب بالمدرسين في تجربة منظمة وآمنة.',
  site_description: 'منصة تعليمية متكاملة',
  contact: {
    email: 'info@manhatalilm.com',
    phone_display: '+966 50 123 4567',
    phone_tel: '+966501234567',
    whatsapp: '966501234567',
    city: 'الرياض، المملكة العربية السعودية',
    facebook: 'https://www.facebook.com',
    youtube: 'https://www.youtube.com',
    instagram: 'https://www.instagram.com',
    tiktok: '',
    telegram: '',
    x: 'https://x.com',
  },
  homepage_texts: {
    hero_badge: 'تعلم أذكى، من أي مكان',
    hero_title_1: 'طريقك الأقصر',
    hero_title_2: 'لإتقان أي مادة',
    hero_subtitle: 'محتوى تعليمي منظم، مدرسون موثوقون، وتقدم محفوظ في مكان واحد. ابدأ درسَك التالي بثقة وبدون تشتت.',
    cta_primary: 'ابدأ التعلم الآن',
    cta_secondary: 'تصفح المدرسين',
    categories_badge: 'التخصصات الدراسية',
    categories_title: 'استكشف التخصصات',
    categories_subtitle: 'مجموعة متنوعة من التخصصات الأكاديمية يدرسها لك أفضل المدرسين',
    teachers_badge: 'دليل المدرسين',
    teachers_title: 'المدرسين',
    teachers_subtitle: 'اختر المدرس المناسب حسب التخصص والخبرة، وابدأ التعلم من منصته التعليمية.',
    rising_badge: 'مواهب جديدة',
    rising_title: 'مدرسون واعدون',
  },
  footer_texts: {
    about: 'منصة تعليمية عربية تجمع الطلاب بالمدرسين في تجربة منظمة وآمنة.',
    copyright: 'جميع الحقوق محفوظة',
    contact_heading: 'تواصل معنا',
  },
  homepage_sections: {
    teachers: true,
    courses: true,
    videos: true,
    categories: true,
    champions: true,
  },
  default_teacher_limit: 12,
  default_course_limit: 6,
  default_video_limit: 6,
};

export function useSiteSettings(): Record<string, any> {
  const [settings, setSettings] = useState<Record<string, any>>(SITE_SETTINGS_DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('site_settings').select('key,value');
        if (cancelled || !data) return;
        setSettings((prev) => {
          const next: Record<string, any> = { ...prev };
          for (const row of data) {
            next[row.key] = row.value;
          }
          return next;
        });
      } catch {
        // Keep defaults if site settings are unavailable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}

export function text(settings: Record<string, any>, key: string, fallback: string): string {
  const v = settings[key];
  if (v == null) return fallback;
  return String(v);
}

export function contact(settings: Record<string, any>) {
  const c = settings.contact ?? {};
  return {
    email: String(c.email ?? SITE_SETTINGS_DEFAULTS.contact.email),
    phone_display: String(c.phone_display ?? SITE_SETTINGS_DEFAULTS.contact.phone_display),
    phone_tel: String(c.phone_tel ?? SITE_SETTINGS_DEFAULTS.contact.phone_tel),
    whatsapp: String(c.whatsapp ?? SITE_SETTINGS_DEFAULTS.contact.whatsapp),
    city: String(c.city ?? SITE_SETTINGS_DEFAULTS.contact.city),
    facebook: String(c.facebook ?? ''),
    youtube: String(c.youtube ?? ''),
    instagram: String(c.instagram ?? ''),
    tiktok: String(c.tiktok ?? ''),
    telegram: String(c.telegram ?? ''),
    x: String(c.x ?? ''),
  };
}

export function whatsappHref(number: string, text?: string) {
  const encoded = encodeURIComponent(text ?? 'مرحباً، أود الاستفسار عن منصة العلم');
  return `https://wa.me/${number}?text=${encoded}`;
}