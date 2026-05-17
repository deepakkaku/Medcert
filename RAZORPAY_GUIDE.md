# MedCert Premium — Razorpay Subscription Implementation Guide

This guide provides the necessary Supabase Edge Function code to make your subscription system production-ready.

## 1. Environment Variables

Set these in your Supabase Project (Dashboard → Settings → API → Edge Function Secrets):

- `RAZORPAY_KEY_ID`: `rzp_test_SoQGCN8QI4VhKa` (Development)
- `RAZORPAY_KEY_SECRET`: `UjRKED4D3TQKZTrsX78CxFMm` (Development)
- `RAZORPAY_WEBHOOK_SECRET`: `whsec_doctrust_premium_dev_2026_9b8a1c` (Suggested for Development)

## 2. Supabase Edge Functions

Create a folder `supabase/functions` in your local project root and add the following functions.

### A. `create-razorpay-subscription`

This function creates a subscription in Razorpay and returns the `subscription_id`.

```typescript
// supabase/functions/create-razorpay-subscription/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')

serve(async (req) => {
  const { plan_id, user_id } = await req.json()

  // 1. Create Subscription in Razorpay
  const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    },
    body: JSON.stringify({
      plan_id: plan_id,
      total_count: 120, // 10 years for monthly
      quantity: 1,
      customer_notify: 1,
      notes: {
        user_id: user_id
      }
    })
  })

  const subscription = await response.json()

  return new Response(JSON.stringify({ subscription_id: subscription.id }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### B. `verify-razorpay-subscription`

This function fetches the latest status from Razorpay and updates your Supabase DB.

```typescript
// supabase/functions/verify-razorpay-subscription/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const { subscription_id } = await req.json()

  // 1. Fetch from Razorpay
  const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription_id}`, {
    headers: {
      'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    }
  })
  const sub = await response.json()

  // 2. Update Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  await supabase
    .from('subscriptions')
    .update({ 
      status: sub.status,
      current_period_end: new Date(sub.current_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('razorpay_subscription_id', subscription_id)

  return new Response(JSON.stringify(sub), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### C. `razorpay-webhook`

Set this URL in Razorpay Dashboard (Settings → Webhooks). It handles automatic updates and includes **signature verification**.

```typescript
// supabase/functions/razorpay-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

serve(async (req) => {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

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
      return new Response("Invalid signature", { status: 401 })
    }
  }

  const body = JSON.parse(rawBody)
  const event = body.event
  const sub = body.payload.subscription.entity

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  if (event.startsWith('subscription.')) {
    const userId = sub.notes.user_id
    
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        razorpay_subscription_id: sub.id,
        razorpay_plan_id: sub.plan_id,
        status: sub.status,
        current_period_start: new Date(sub.current_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

## 3. Database Schema

Ensure your `subscriptions` table matches the one in `premium/supabase_migration.sql`.

## 4. Deploy

Use the Supabase CLI to deploy these functions:

```bash
supabase functions deploy create-razorpay-subscription
supabase functions deploy verify-razorpay-subscription
supabase functions deploy razorpay-webhook
```
