import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    const { data: admin } = await userClient.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!admin) throw new Error('Admin access required');

    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '').trim();
    const fullName = String(body.fullName ?? '').trim();
    const specialization = String(body.specialization ?? '').trim();
    const location = String(body.location ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const bio = String(body.bio ?? '').trim();
    
    if (!email || !password || !fullName) throw new Error('Email, password and full name are required');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // إنشاء المستخدم باستخدام service role key
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        is_teacher: true,
        is_manager: false,
        is_approved: true,
        specialization,
        location,
        phone,
        bio,
      }
    });

    if (createError) {
      console.error('Create User Error:', createError);
      if (createError.message.includes('User already registered')) {
        throw new Error('البريد الإلكتروني مسجل بالفعل في النظام');
      }
      throw createError;
    }

    if (!newUser.user) throw new Error('Failed to create user');

    // إنشاء الملف الشخصي
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: newUser.user.id,
      email,
      full_name: fullName,
      is_teacher: true,
      is_manager: false,
      is_approved: true,
      specialization: specialization || null,
      location: location || null,
      phone: phone || null,
      bio: bio || null,
    });

    if (profileError) {
      console.error('Profile Error:', profileError);
      // حذف المستخدم إذا فشل إنشاء الملف الشخصي
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      throw new Error('فشل إنشاء الملف الشخصي: ' + profileError.message);
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      userId: newUser.user.id,
      email: email,
      message: 'تم إنشاء الحساب بنجاح'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Full Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create teacher account' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});