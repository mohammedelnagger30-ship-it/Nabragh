export function translateAuthError(message: string | null | undefined): string {
  if (!message) return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  const text = message.toLowerCase();

  if (text.includes('invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (text.includes('email not confirmed')) return 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.';
  if (text.includes('user already registered') || text.includes('already registered')) return 'هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول.';
  if (text.includes('password')) return 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.';
  if (text.includes('rate limit') || text.includes('too many')) return 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.';
  if (text.includes('network') || text.includes('fetch')) return 'تعذر الاتصال. تحقق من الإنترنت ثم أعد المحاولة.';
  if (text.includes('signup is disabled')) return 'التسجيل متوقف مؤقتًا. تواصل مع الدعم.';
  if (/[\u0600-\u06FF]/.test(message)) return message;
  return 'تعذر إتمام العملية. تحقق من البيانات وحاول مرة أخرى.';
}
