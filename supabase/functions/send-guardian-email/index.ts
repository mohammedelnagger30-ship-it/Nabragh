import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface GuardianEmailPayload {
  student_id: string;
  subject: string;
  html_body: string;
}

async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? 'Resend email failed');
  return data;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const fromEmail = Deno.env.get('GUARDIAN_EMAIL_FROM') ?? 'no-reply@nabragh.com';

    if (!resendApiKey) return json({ error: 'RESEND_API_KEY not configured' }, 500);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const payload: GuardianEmailPayload = await request.json();
    const { student_id, subject, html_body } = payload;

    if (!student_id || !subject || !html_body) {
      return json({ error: 'Missing required fields: student_id, subject, html_body' }, 400);
    }

    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('full_name, guardian_phone, phone, email, education_stage')
      .eq('id', student_id)
      .single();

    if (studentError || !student) return json({ error: 'Student not found' }, 404);

    const guardianEmail = (student as Record<string, unknown>).guardian_email as string | null;
    if (!guardianEmail) return json({ error: 'Guardian email not set', guardian_phone: (student as Record<string, unknown>).guardian_phone }, 400);

    const result = await sendViaResend(resendApiKey, fromEmail, guardianEmail, subject, html_body);

    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'guardian_email_sent',
      target_type: 'student',
      target_id: student_id,
      details: { subject, to: guardianEmail, resend_id: result?.id },
    }).select();

    return json({ success: true, id: result?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
