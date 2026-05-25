import assert from 'node:assert/strict'
import {
  getSubscriptionPayload,
  shouldApplySubscriptionUpdate,
} from '../supabase/functions/_shared/razorpaySubscription.ts'

assert.equal(
  getSubscriptionPayload({
    event: 'payment.failed',
    payload: { payment: { entity: { id: 'pay_123' } } },
  }),
  null,
  'non-subscription webhook payloads should be ignored'
)

assert.equal(
  shouldApplySubscriptionUpdate(
    {
      razorpay_subscription_id: 'sub_active',
      status: 'active',
      current_period_end: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'sub_abandoned',
      status: 'created',
      created_at: 100,
    }
  ),
  false,
  'a created event from an abandoned checkout should not overwrite an active subscription'
)

assert.equal(
  shouldApplySubscriptionUpdate(
    {
      razorpay_subscription_id: 'sub_same',
      status: 'active',
      current_period_end: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'sub_same',
      status: 'cancelled',
      created_at: 100,
    }
  ),
  true,
  'terminal updates for the same subscription should still apply'
)

assert.equal(
  shouldApplySubscriptionUpdate(
    {
      razorpay_subscription_id: 'sub_active',
      status: 'active',
      current_period_end: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'sub_abandoned',
      status: 'cancelled',
      created_at: 100,
    }
  ),
  false,
  'terminal events from a different abandoned checkout should not overwrite an active subscription'
)

console.log('razorpaySubscription tests passed')
