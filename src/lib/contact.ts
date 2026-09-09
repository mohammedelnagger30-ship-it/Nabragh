export const CONTACT = {
  email: 'info@manhatalilm.com',
  phoneDisplay: '+966 50 123 4567',
  phoneTel: '+966501234567',
  whatsapp: '966501234567',
  city: 'الرياض، المملكة العربية السعودية',
  facebook: 'https://www.facebook.com',
  youtube: 'https://www.youtube.com',
  instagram: 'https://www.instagram.com',
};

export function whatsappLink(text?: string) {
  const encoded = encodeURIComponent(text ?? 'مرحباً، أود الاستفسار عن منصة العلم');
  return `https://wa.me/${CONTACT.whatsapp}?text=${encoded}`;
}
