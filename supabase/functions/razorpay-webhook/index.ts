import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts"
import {
  getSubscriptionPayload,
  isScheduledToCancel,
  shouldApplySubscriptionUpdate,
  toIsoFromSeconds,
} from '../_shared/razorpaySubscription.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')

    if (!RAZORPAY_WEBHOOK_SECRET) {
      throw new Error('Razorpay webhook secret not configured')
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase service credentials not configured')
    }

    if (RAZORPAY_WEBHOOK_SECRET && !signature) {
      return new Response("Missing signature", {
        status: 401,
        headers: corsHeaders
      })
    }

    // 1. Verify Signature
    if (RAZORPAY_WEBHOOK_SECRET && signature) {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(RAZORPAY_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      )
      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(rawBody)
      )
      const expectedSignature = Array.from(new Uint8Array(signatureBytes))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")

      if (signature !== expectedSignature) {
        return new Response("Invalid signature", { 
          status: 401, 
          headers: corsHeaders 
        })
      }
    }

    const body = JSON.parse(rawBody)
    const event = body.event
    const sub = getSubscriptionPayload(body)

    if (!sub) {
      console.log(`Ignoring Razorpay event without subscription payload: ${event}`)
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing Razorpay event: ${event} for subscription: ${sub.id}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const userId = sub.notes?.user_id
    
    if (!userId) {
      console.error('CRITICAL: No user_id found in subscription notes. Cannot update database.')
      return new Response(JSON.stringify({ error: "Missing user_id in notes" }), { 
        status: 200, // Still return 200 to Razorpay to avoid retries, but log error
        headers: corsHeaders 
      })
    }

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('razorpay_subscription_id, status, cancel_at_cycle_end, current_period_end')
      .eq('user_id', userId)
      .maybeSingle()

    if (!shouldApplySubscriptionUpdate(existingSub, sub)) {
      console.log(`Ignoring stale Razorpay event ${event} for subscription ${sub.id} with status ${sub.status}`)
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: dbError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        razorpay_subscription_id: sub.id,
        razorpay_plan_id: sub.plan_id,
        status: sub.status,
        current_period_start: toIsoFromSeconds(sub.current_start),
        current_period_end: toIsoFromSeconds(sub.current_end),
        cancel_at_cycle_end: isScheduledToCancel(existingSub, sub),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('Database Update Error:', dbError)
      throw dbError
    }

    console.log(`Successfully updated subscription for user ${userId} to status ${sub.status}`)

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
