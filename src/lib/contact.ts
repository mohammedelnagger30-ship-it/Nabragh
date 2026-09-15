export const CONTACT = {
  email: 'info@manhatalilm.com',
  phoneDisplay: '+20 10 0000 0000',
  phoneTel: '+201000000000',
  whatsapp: '201000000000',
  city: 'القاهرة، جمهورية مصر العربية',
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
