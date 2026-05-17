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
    const { plan_id, user_id } = await req.json()
    console.log(`[SUBSCRIPTION_CREATE] Received request for user ${user_id}`)
    console.log(`[SUBSCRIPTION_CREATE] Target Razorpay Plan ID: ${plan_id}`)

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured')
    }

    // 1. Safety Check: Check if user already has an active subscription in DB
    // This prevents accidental double subscriptions
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('status, razorpay_subscription_id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (existingSub?.status === 'active' || existingSub?.status === 'authenticated') {
      console.log(`User ${user_id} already has an active subscription: ${existingSub.razorpay_subscription_id}`)
      // We return the existing one instead of creating a new one
      return new Response(JSON.stringify({ 
        subscription_id: existingSub.razorpay_subscription_id,
        already_active: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Fetch Plan details from Razorpay to determine interval
    const planResponse = await fetch(`https://api.razorpay.com/v1/plans/${plan_id}`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
      }
    })
    const plan = await planResponse.json()
    if (!planResponse.ok) {
      throw new Error(plan.error?.description || 'Failed to fetch plan from Razorpay')
    }

    // Determine total_count based on interval
    // Razorpay max total_count for yearly is 100
    const totalCount = plan.period === 'yearly' ? 99 : 600;
    console.log(`[SUBSCRIPTION_CREATE] Using total_count: ${totalCount} for interval: ${plan.period}`)

    // 3. Create Subscription in Razorpay
    const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
      },
      body: JSON.stringify({
        plan_id: plan_id,
        total_count: totalCount,
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_id: user_id
        }
      })
    })

    const subscription = await response.json()

    if (!response.ok) {
      console.error('Razorpay Subscription Creation Error:', subscription)
      throw new Error(subscription.error?.description || 'Failed to create subscription in Razorpay')
    }

    console.log(`Subscription created successfully: ${subscription.id}`)

    return new Response(JSON.stringify({ subscription_id: subscription.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Create Subscription Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
