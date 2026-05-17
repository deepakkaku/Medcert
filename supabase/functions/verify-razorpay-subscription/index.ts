import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    if (!userId) {
      console.warn('No user_id found in subscription notes')
    }

    // 2. Update Supabase - use upsert to handle new subscription IDs for existing users
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('cancel_at_cycle_end, current_period_end')
      .eq('razorpay_subscription_id', subscription_id)
      .maybeSingle()
    
    // Reconciliation Logic:
    // 1. Explicit flag from Razorpay
    // 2. Scheduled changes flag
    // 3. Robust check: if end_at matches current_end, it's scheduled to cancel at the end of this cycle.
    // 4. Preserve a locally confirmed end-of-cycle cancellation because Razorpay keeps status active until then.
    const existingEnd = existingSub?.current_period_end ? new Date(existingSub.current_period_end) : null
    const shouldPreserveScheduledCancel =
      existingSub?.cancel_at_cycle_end === true &&
      sub.status !== 'cancelled' &&
      sub.status !== 'expired' &&
      (!existingEnd || existingEnd > new Date())

    const isScheduledToCancel = 
      !!sub.cancel_at_cycle_end || 
      !!sub.has_scheduled_changes || 
      (sub.end_at && sub.current_end && sub.end_at === sub.current_end) ||
      shouldPreserveScheduledCancel;
    
    console.log(`[SUBSCRIPTION_SYNC] ${sub.id} status: ${sub.status}, Scheduled Cancel: ${isScheduledToCancel}`)

    const updateData: any = {
      razorpay_subscription_id: sub.id,
      razorpay_plan_id: sub.plan_id,
      status: sub.status,
      current_period_start: sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null,
      current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
      cancel_at_cycle_end: isScheduledToCancel,
      updated_at: new Date().toISOString()
    }

    // If we have a userId, we can upsert by user_id which is the primary constraint
    if (userId) {
      const { error: dbError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          ...updateData
        }, { onConflict: 'user_id' })

      if (dbError) {
        console.error('Database Upsert Error:', dbError)
      }
    } else {
      // Fallback to update by subscription_id if user_id is missing in notes
      const { error: dbError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('razorpay_subscription_id', subscription_id)

      if (dbError) {
        console.error('Database Update Error:', dbError)
      }
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
