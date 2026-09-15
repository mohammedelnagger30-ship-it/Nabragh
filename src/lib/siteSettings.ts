import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const SITE_SETTINGS_DEFAULTS: Record<string, any> = {
  site_name: 'Noona',
  site_tagline: 'منصتك التعليمية الشاملة',
  site_description: 'منصة تعليمية متكاملة',
  contact: {
    email: 'info@manhatalilm.com',
    phone_display: '+20 10 0000 0000',
    phone_tel: '+201000000000',
    whatsapp: '201000000000',
    city: 'القاهرة، جمهورية مصر العربية',
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

let settingsPromise: Promise<Record<string, any>> | null = null;
let settingsLoadedAt = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000;

function loadSiteSettings(): Promise<Record<string, any>> {
  if (settingsPromise && Date.now() - settingsLoadedAt < SETTINGS_CACHE_TTL) {
    return settingsPromise;
  }
  settingsPromise = (async () => {
    const merged: Record<string, any> = { ...SITE_SETTINGS_DEFAULTS };
    try {
      const { data } = await supabase.from('site_settings').select('key,value');
      if (data) {
        for (const row of data) {
          merged[row.key] = row.value;
        }
      }
    } catch {
      // Keep defaults if site settings are unavailable
    }
    settingsLoadedAt = Date.now();
    return merged;
  })();
  return settingsPromise;
}

export function invalidateSiteSettingsCache(): void {
  settingsPromise = null;
}

export function useSiteSettings(): Record<string, any> {
  const [settings, setSettings] = useState<Record<string, any>>(SITE_SETTINGS_DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    void loadSiteSettings().then((res) => {
      if (!cancelled) setSettings(res);
    });
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