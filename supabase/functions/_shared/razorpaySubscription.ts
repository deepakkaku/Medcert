export interface ExistingSubscription {
  razorpay_subscription_id?: string | null
  status?: string | null
  current_period_end?: string | null
  cancel_at_cycle_end?: boolean | null
}

export interface RazorpaySubscriptionEntity {
  id: string
  plan_id?: string | null
  status?: string | null
  current_start?: number | null
  current_end?: number | null
  end_at?: number | null
  cancel_at_cycle_end?: boolean | null
  has_scheduled_changes?: boolean | null
  created_at?: number | null
  notes?: {
    user_id?: string | null
    [key: string]: unknown
  } | null
}

export interface RazorpayWebhookBody {
  event?: string
  payload?: {
    subscription?: {
      entity?: RazorpaySubscriptionEntity
    }
  }
}

const ACTIVE_STATUSES = new Set(['authenticated', 'active', 'paused'])

export const getSubscriptionPayload = (body: RazorpayWebhookBody): RazorpaySubscriptionEntity | null => {
  if (!body.event?.startsWith('subscription.')) return null
  return body.payload?.subscription?.entity ?? null
}

export const shouldApplySubscriptionUpdate = (
  existing: ExistingSubscription | null | undefined,
  incoming: RazorpaySubscriptionEntity
): boolean => {
  if (!existing?.razorpay_subscription_id || existing.razorpay_subscription_id === incoming.id) {
    return true
  }

  const existingStatus = existing.status ?? ''
  const incomingStatus = incoming.status ?? ''

  if (ACTIVE_STATUSES.has(existingStatus)) {
    return ACTIVE_STATUSES.has(incomingStatus)
  }

  return true
}

export const isScheduledToCancel = (
  existing: ExistingSubscription | null | undefined,
  incoming: RazorpaySubscriptionEntity
): boolean => {
  const existingEnd = existing?.current_period_end ? new Date(existing.current_period_end) : null
  const shouldPreserveScheduledCancel =
    existing?.cancel_at_cycle_end === true &&
    incoming.status !== 'cancelled' &&
    incoming.status !== 'expired' &&
    (!existingEnd || existingEnd > new Date())

  return !!incoming.cancel_at_cycle_end ||
    !!incoming.has_scheduled_changes ||
    !!(incoming.end_at && incoming.current_end && incoming.end_at === incoming.current_end) ||
    shouldPreserveScheduledCancel
}

export const toIsoFromSeconds = (seconds?: number | null): string | null =>
  seconds ? new Date(seconds * 1000).toISOString() : null
