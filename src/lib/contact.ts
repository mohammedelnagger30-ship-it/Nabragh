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

export function whatsappLink(text?: string, phone?: string) {
  const safePhone = (phone ?? CONTACT.whatsapp).replace(/\D/g, '') || CONTACT.whatsapp;
  const safeText = text ?? 'مرحباً، أود الاستفسار عن منصة العلم';
  const encoded = encodeURIComponent(safeText);
  return `https://wa.me/${safePhone}?text=${encoded}`;
}
