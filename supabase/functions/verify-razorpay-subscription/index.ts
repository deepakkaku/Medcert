import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAuthenticatedUserId } from '../_shared/auth.ts'
import {
  isScheduledToCancel,
  shouldApplySubscriptionUpdate,
  toIsoFromSeconds,
} from '../_shared/razorpaySubscription.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subscription_id } = await req.json()
    if (!subscription_id) {
      throw new Error('subscription_id is required')
    }
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured')
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase service credentials not configured')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const authUserId = await getAuthenticatedUserId(req, supabase)

    // 1. Fetch from Razorpay
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription_id}`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
      }
    })
    const sub = await response.json()

    if (!response.ok) {
      throw new Error(sub.error?.description || 'Failed to fetch subscription from Razorpay')
    }

    const userId = sub.notes?.user_id
    if (userId && userId !== authUserId) {
      throw new Error('Subscription does not belong to authenticated user')
    }

    // 2. Update Supabase - use upsert to handle new subscription IDs for existing users
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('razorpay_subscription_id, status, cancel_at_cycle_end, current_period_end')
      .eq('user_id', authUserId)
      .maybeSingle()

    if (!userId && existingSub?.razorpay_subscription_id !== subscription_id) {
      throw new Error('Subscription owner could not be verified')
    }
    if (!shouldApplySubscriptionUpdate(existingSub, sub)) {
      console.log(`[SUBSCRIPTION_SYNC] Ignoring stale update for ${sub.id} with status ${sub.status}`)
      return new Response(JSON.stringify(sub), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const scheduledCancel = isScheduledToCancel(existingSub, sub)
    console.log(`[SUBSCRIPTION_SYNC] ${sub.id} status: ${sub.status}, Scheduled Cancel: ${scheduledCancel}`)

    const updateData: any = {
      razorpay_subscription_id: sub.id,
      razorpay_plan_id: sub.plan_id,
      status: sub.status,
      current_period_start: toIsoFromSeconds(sub.current_start),
      current_period_end: toIsoFromSeconds(sub.current_end),
      cancel_at_cycle_end: scheduledCancel,
      updated_at: new Date().toISOString()
    }

    const { error: dbError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: authUserId,
        ...updateData
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('Database Upsert Error:', dbError)
      throw dbError
    }

    return new Response(JSON.stringify(sub), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
