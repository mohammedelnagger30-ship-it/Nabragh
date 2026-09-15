# خطوات الحصول على توكن Supabase ونشر الدوال

## 1. الحصول على توكن Supabase

### الطريقة الأولى: من لوحة تحكم Supabase (الأسهل)

1. اذهب إلى [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. سجل الدخول بحسابك
3. اختر مشروعك
4. اذهب إلى **Settings** في القائمة الجانبية
5. اذهب إلى **API**
6. انسخ **service_role key** (يحتوي على "eyJ...")
7. هذا التوكن له صلاحيات كاملة

### الطريقة الثانية: باستخدام سطر الأوامر

```bash
# تسجيل الدخول
supabase login

# سيفتح المتصفح للتحقق من هويتك
# بعد تسجيل الدخول، سيتم حفظ التوكن تلقائياً
```

## 2. نشر الدوال

### الطريقة الأولى: من لوحة تحكم Supabase (الأسهل)

1. اذهب إلى [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **Edge Functions** في القائمة الجانبية
4. انقر على **New Function**
5. اسم الدالة: `admin-invite-teacher`
6. انسخ الكود من الملف: `supabase/functions/admin-invite-teacher/index.ts`
7. الصق الكود في المحرر
8. انقر على **Deploy**

### الطريقة الثانية: باستخدام سطر الأوامر

```bash
# بعد تسجيل الدخول
cd D:\Desktop\program\python\teacher
supabase functions deploy admin-invite-teacher
```

## 3. نشر الدالة الجديدة (اختياري)

إذا أردت نشر الدالة الجديدة `admin-create-teacher`:

```bash
supabase functions deploy admin-create-teacher
```

## 4. تطبيق الـ Migration (لإنشاء RPC function)

```bash
supabase db push
```

### ترتيب نظام عمولات المدرسين

ملفات نظام العمولات تعتمد على بعضها ويجب تطبيقها من خلال `supabase db push` من مجلد المشروع. لا تشغّل ملف `20260915010000_harden_teacher_payout_generation.sql` وحده من SQL Editor؛ فهو يعتمد على الجداول التي ينشئها الملف `20260915000000_add_commission_and_payout_system.sql`.

إذا كنت تستخدم SQL Editor، شغّل الملفين بهذا الترتيب:

1. `supabase/migrations/20260915000000_add_commission_and_payout_system.sql`
2. `supabase/migrations/20260915010000_harden_teacher_payout_generation.sql`

## حل مشاكل شائعة

### مشكلة: "Access token not provided"
الحل: قم بتسجيل الدخول أولاً:
```bash
supabase login
```

### مشكلة: "Function not found"
الحل: تأكد من نشر الدالة بالاسم الصحيح

### مشكلة: "Rate limit exceeded"
الحل: بعد نشر الدالة المعدلة، سيتم حل هذه المشكلة

## النتيجة المتوقعة

بعد نشر الدالة المعدلة `admin-invite-teacher`:
- إنشاء حسابات المدرسين سيعمل بدون مشاكل rate limit
- يمكن إنشاء حسابات متعددة بسرعة
- لا حاجة للانتظار بين عمليات الإنشاء