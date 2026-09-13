# Noona - Educational Platform

الإصدار 1.0.0

## نظرة عامة

منصة تعليمية متكاملة تربط بين الطلاب والمعلمين، توفر تجربة تعليمية احترافية مع ميزات متقدمة للمدرسين والطلاب.

## الميزات الرئيسية

### للطلاب
- تصفح المعلمين والكورسات
- مشاهدة الفيديوهات التعليمية
- الاشتراك في الكورسات
- متابعة التقدم التعليمي
- المشاركة في المسابقات التعليمية
- الحصول على شهادات إتمام

### للمعلمين
- إنشاء وإدارة الكورسات
- رفع الفيديوهات التعليمية
- إدارة الاشتراكات
- لوحة تحكم احترافية
- أدوات إحصائيات متقدمة
- جلسات مباشرة مجدولة

### للإدارة
- لوحة تحكم شاملة
- إدارة المعلمين والموافقات
- إحصائيات المنصة
- إدارة الإعدادات العامة

## التقنيات المستخدمة

### Frontend
- React 18.3.1
- TypeScript 5.5.3
- Vite 5.4.2
- React Router DOM 6.30.6
- Tailwind CSS 3.4.1
- Lucide React 0.446.0

### Backend
- Supabase (Authentication, Database, Storage)
- PostgreSQL

### Mobile
- Capacitor 8.5.1
- Android Support

## التثبيت والتشغيل

### المتطلبات
- Node.js 18 أو أحدث
- npm أو yarn

### خطوات التثبيت

1. استنساخ المشروع:
```bash
git clone https://github.com/mohammedelnagger30-ship-it/Nabragh.git
cd Nabragh
```

2. تثبيت المكتبات:
```bash
npm install
```

3. إعداد المتغيرات البيئية:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. تشغيل خادم التطوير:
```bash
npm run dev
```

5. بناء التطبيق للإنتاج:
```bash
npm run build
```

## إعداد Supabase

راجع ملف `SUPABASE_SETUP.md` للحصول على تعليمات تفصيلية لإعداد قاعدة البيانات والتخزين.

## البناء للتطبيق المحمول

### Android
```bash
npm run mobile:android
```

### iOS
```bash
npm run mobile:ios
```

## هيكل المشروع

```
src/
├── components/       # المكونات القابلة لإعادة الاستخدام
├── context/         # سياق التطبيق (Auth, Theme, Toast)
├── lib/             # المكتبات المساعدة
├── pages/           # صفحات التطبيق
├── App.tsx          # المكون الرئيسي
└── main.tsx         # نقطة الدخول

supabase/
├── migrations/      # ترحيلات قاعدة البيانات
└── functions/       # وظائف Supabase Edge
```

## السكريبتات المتاحة

- `npm run dev` - تشغيل خادم التطوير
- `npm run build` - بناء التطبيق
- `npm run preview` - معاينة البناء
- `npm run lint` - فحص الكود
- `npm run typecheck` - فحص TypeScript
- `npm run mobile:sync` - مزامنة مع Capacitor
- `npm run mobile:android` - فتح مشروع Android
- `npm run mobile:ios` - فتح مشروع iOS

## الترخيص

هذا المشروع خاص ومملوك لـ Noona.

## الدعم

للدعم والاستفسارات، تواصل معنا عبر:
- البريد الإلكتروني: support@nabragh.com
- الواتساب: [رابط الواتساب]

## الإصدارات

### v1.0.0 (الإصدار الحالي)
- إطلاق المنصة التعليمية
- نظام تسجيل دخول متكامل
- لوحة تحكم للمعلمين
- لوحة تحكم للإدارة
- نظام الفيديوهات والكورسات
- نظام الاشتراكات
- نظام المسابقات التعليمية
- تطبيق محمول (Android)
