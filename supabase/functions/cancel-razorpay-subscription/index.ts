import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAuthenticatedUserId } from '../_shared/auth.ts'

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
    const { subscription_id, immediate = false } = await req.json()
    if (!subscription_id) {
      throw new Error('subscription_id is required')
    }
    console.log(`Cancelling subscription ${subscription_id} (Immediate: ${immediate})`)

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured in Supabase secrets')
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase service credentials not configured')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const authUserId = await getAuthenticatedUserId(req, supabase)

    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id, current_period_end')
      .eq('razorpay_subscription_id', subscription_id)
      .single()

    if (subError || !subData) {
      throw new Error('Subscription not found')
    }
    if (subData.user_id !== authUserId) {
      throw new Error('Cannot cancel another user subscription')
    }

    const auth = btoa(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET)
    
    // 1. Cancel in Razorpay
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + auth
      },
      body: JSON.stringify({
        cancel_at_cycle_end: !immediate
      })
    })
    
    const result = await response.json()

    if (!response.ok) {
      console.error('Razorpay Cancellation Error:', result)
      // If subscription is already cancelled or expired, handle it gracefully
      if (result.error?.code === 'BAD_REQUEST_ERROR' && (result.error?.description?.includes('cancelled') || result.error?.description?.includes('expired'))) {
        console.log('Subscription is already in a non-cancellable state')
      } else {
        throw new Error(result.error?.description || 'Failed to cancel subscription in Razorpay')
      }
    }

    console.log(`Subscription ${subscription_id} cancelled in Razorpay successfully`)

    // 2. Update status in Supabase
    const updatePayload: any = {
      status: result.status || 'cancelled',
      cancel_at_cycle_end: !immediate,
      current_period_end: result.current_end ? new Date(result.current_end * 1000).toISOString() : subData?.current_period_end ?? null,
      updated_at: new Date().toISOString()
    }

    const { error: dbError } = await supabase
      .from('subscriptions')
      .update(updatePayload)
      .eq('user_id', authUserId)

    if (dbError) {
      console.error('Database Update Error:', dbError)
      throw dbError
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Cancellation Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
