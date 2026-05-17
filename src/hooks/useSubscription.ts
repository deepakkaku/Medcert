import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Subscription } from '../types'
import { useAuth } from '../context/AuthContext'

export const useSubscription = () => {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const userId = user?.id

  const fetchSubscription = useCallback(async (forceSync = false, overrideId?: string) => {
    if (!userId) {
      setSubscription(null)
      setIsLoading(false)
      return
    }
    
    // Safety timeout for subscription check
    const timeout = setTimeout(() => setIsLoading(false), 5000)
    
    try {
      // Only show loader if we don't have a subscription state yet or if forcing sync
      if (!subscription || forceSync || overrideId) {
        setIsLoading(true)
      }
      
      let { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Subscription check error:', error)
      }

      // If we have a subscription ID (or an override ID) and we need to sync
      const subIdToSync = overrideId || data?.razorpay_subscription_id;

      // Sync logic:
      // 1. We have a subIdToSync
      // 2. AND (Status is NOT active OR forceSync is true OR it's a new subscription ID)
      if (subIdToSync && (data?.status !== 'active' || forceSync || overrideId)) {
        console.log(`Syncing subscription ${subIdToSync} with Razorpay...`);
        try {
          const { checkSubscriptionStatus } = await import('../services/razorpayService')
          const latestStatus = await checkSubscriptionStatus(subIdToSync)

          if (latestStatus && latestStatus.status) {
            console.log(`Latest Razorpay status for ${subIdToSync}: ${latestStatus.status}`);
            
            // Reconciliation Logic: Match the Edge Function
            const isScheduledToCancel = 
              !!latestStatus.cancel_at_cycle_end || 
              !!latestStatus.has_scheduled_changes || 
              (latestStatus.end_at && latestStatus.current_end && latestStatus.end_at === latestStatus.current_end) ||
              (data?.cancel_at_cycle_end === true &&
                latestStatus.status !== 'cancelled' &&
                latestStatus.status !== 'expired' &&
                (!data?.current_period_end || new Date(data.current_period_end) > new Date()));

            // Update local state with fresh data from Razorpay
            data = {
              ...data,
              user_id: userId,
              razorpay_subscription_id: latestStatus.id || subIdToSync,
              razorpay_plan_id: latestStatus.plan_id || data?.razorpay_plan_id,
              status: latestStatus.status,
              current_period_end: latestStatus.current_end ? new Date(latestStatus.current_end * 1000).toISOString() : data?.current_period_end,
              cancel_at_cycle_end: !!isScheduledToCancel
            }
          }
        } catch (syncErr) {
          console.error('Failed to sync with Razorpay:', syncErr)
        }
      }
              setSubscription(data as Subscription | null)
              } catch (err) {
              console.error('Subscription error:', err)
              } finally {
              setIsLoading(false)
              clearTimeout(timeout)
              }
              }, [userId, subscription])

              useEffect(() => {
              fetchSubscription()
              // We only want to run this when userId changes
              // eslint-disable-next-line react-hooks/exhaustive-deps
              }, [userId])

              // Improved access logic:
              // 1. Status is 'active', 'authenticated', or 'pending' (grace period) -> Always active
              // 2. Even if 'cancelled' or 'expired', if current_period_end is in the future, it's still active (grace period)
              const isActive = (
                subscription?.status === 'active' || 
                subscription?.status === 'authenticated' ||
                subscription?.status === 'pending' ||
                (subscription?.current_period_end && 
                 new Date(subscription.current_period_end) > new Date())
              )
  const isExpired = !isActive && (
    subscription?.status === 'expired' || 
    subscription?.status === 'cancelled' || 
    subscription?.status === 'halted'
  )

  return {
    subscription,
    isActive,
    isExpired,
    isLoading,
    refresh: () => fetchSubscription(false),
    sync: (id?: string) => fetchSubscription(true, id),
  }
}
