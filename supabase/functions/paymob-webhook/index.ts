import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const hmacFields = ['amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_void', 'order.id', 'owner', 'pending', 'source_data.pan', 'source_data.sub_type', 'source_data.type'];

const readPath = (value: Record<string, unknown>, path: string) => path.split('.').reduce<unknown>((current, key) => (current as Record<string, unknown> | null)?.[key], value);
const valueForHmac = (value: unknown) => value === true ? 'true' : value === false ? 'false' : String(value ?? '');

async function validHmac(payload: Record<string, unknown>, signature: string | null) {
  const secret = Deno.env.get('PAYMOB_HMAC_SECRET');
  if (!secret) return true;
  if (!signature) return false;
  const raw = hmacFields.map((field) => valueForHmac(readPath(payload, field))).join('');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const calculated = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return calculated === signature;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (!await validHmac(payload, new URL(request.url).searchParams.get('hmac'))) {
      return new Response('invalid hmac', { status: 401, headers: corsHeaders });
    }

    const obj = (payload.obj ?? {}) as Record<string, unknown>;
    const order = (obj.order ?? {}) as Record<string, unknown>;
    const orderId = String(order.id ?? '');
    const transactionId = String(obj.id ?? '');
    if (!orderId || !transactionId) return new Response('missing payment identifiers', { status: 400, headers: corsHeaders });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const success = obj.success === true;
    const update = success ? {
      status: 'paid', paid_at: new Date().toISOString(), payout_status: 'approved', provider_transaction_id: transactionId, payment_error: null,
    } : {
      status: 'failed', provider_transaction_id: transactionId, payment_error: String(obj.data ?? 'Paymob payment failed'),
    };
    const { data: payment, error } = await supabase.from('payments').update(update).eq('provider', 'paymob').eq('provider_order_id', orderId).select('id,subscription_id').maybeSingle();
    if (error) throw error;

    if (payment?.subscription_id && success) {
      await supabase.from('subscriptions').update({ status: 'active', payment_status: 'paid' }).eq('id', payment.subscription_id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
