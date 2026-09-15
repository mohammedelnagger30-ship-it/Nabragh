import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

async function paymobRequest(path: string, body: Record<string, unknown>) {
  const baseUrl = Deno.env.get('PAYMOB_BASE_URL') ?? 'https://accept.paymob.com/api';
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail ?? data?.message ?? 'Paymob request failed');
  return data;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { paymentId } = await request.json();
    if (!paymentId) return json({ error: 'paymentId is required' }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: payment, error: paymentError } = await adminClient
      .from('payments')
      .select('id,student_id,amount,currency,status,provider_order_id,payment_url')
      .eq('id', paymentId)
      .eq('student_id', user.id)
      .maybeSingle();
    if (paymentError || !payment) return json({ error: 'Payment not found' }, 404);
    if (payment.status !== 'pending') return json({ error: 'Payment is not pending' }, 400);
    if (payment.payment_url) return json({ paymentUrl: payment.payment_url });

    const paymobApiKey = Deno.env.get('PAYMOB_API_KEY');
    const integrationId = Deno.env.get('PAYMOB_INTEGRATION_ID');
    const iframeId = Deno.env.get('PAYMOB_IFRAME_ID');
    if (!paymobApiKey || !integrationId || !iframeId) return json({ error: 'Paymob is not configured' }, 503);

    const amountCents = Math.round(Number(payment.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) return json({ error: 'Invalid payment amount' }, 400);

    const { data: profile } = await adminClient.from('profiles').select('full_name,email,phone').eq('id', user.id).single();
    const nameParts = String(profile?.full_name ?? 'Customer').trim().split(/\s+/);
    const billingData = {
      apartment: 'NA', email: profile?.email ?? user.email ?? 'customer@example.com', floor: 'NA', first_name: nameParts[0] ?? 'Customer',
      street: 'NA', building: 'NA', phone_number: profile?.phone ?? '01000000000', shipping_method: 'PKG', postal_code: 'NA', city: 'Cairo',
      country: 'EG', last_name: nameParts.slice(1).join(' ') || 'Customer', state: 'Cairo',
    };

    const auth = await paymobRequest('/auth/tokens', { api_key: paymobApiKey });
    const order = await paymobRequest('/ecommerce/orders', {
      auth_token: auth.token, delivery_needed: false, amount_cents: amountCents, currency: 'EGP', items: [],
    });
    const paymentKey = await paymobRequest('/acceptance/payment_keys', {
      auth_token: auth.token, amount_cents: amountCents, expiration: 3600, order_id: order.id,
      billing_data: billingData, currency: 'EGP', integration_id: Number(integrationId),
    });

    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${encodeURIComponent(iframeId)}?payment_token=${encodeURIComponent(paymentKey.token)}`;
    const { error: updateError } = await adminClient.from('payments').update({
      provider: 'paymob', provider_order_id: String(order.id), payment_url: paymentUrl, payment_error: null,
    }).eq('id', payment.id);
    if (updateError) throw updateError;

    return json({ paymentUrl, providerOrderId: String(order.id) });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Could not create payment link' }, 400);
  }
});
