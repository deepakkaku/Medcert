// Razorpay Subscription Service

declare global {
  interface Window {
    Razorpay: any
  }
}

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export interface RazorpaySubscriptionOptions {
  subscriptionId: string
  userName: string
  userEmail: string
  onSuccess: (response: RazorpayResponse) => void
  onDismiss: () => void
}

export interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

export const openRazorpaySubscription = async (options: RazorpaySubscriptionOptions): Promise<void> => {
  const loaded = await loadRazorpayScript()
  if (!loaded) throw new Error('Failed to load Razorpay SDK')

  const rzp = new window.Razorpay({
    key: RAZORPAY_KEY_ID,
    subscription_id: options.subscriptionId,
    prefill: {
      name: options.userName,
      email: options.userEmail,
    },
    theme: {
      color: '#006e7e',
    },
    handler: (response: RazorpayResponse) => {
      options.onSuccess(response)
    },
    modal: {
      ondismiss: options.onDismiss,
    },
  })

  rzp.open()
}

// Call your backend / Supabase edge function to create a Razorpay subscription
export const createRazorpaySubscription = async (planId: string, userId: string): Promise<string> => {
  // This calls the Supabase Edge Function which uses Razorpay server-side API
  const { supabase } = await import('../lib/supabase')
  const { data, error } = await supabase.functions.invoke('create-razorpay-subscription', {
    body: { plan_id: planId, user_id: userId },
  })
  if (error) throw error
  return data.subscription_id as string
}

// Call your backend to verify the latest status from Razorpay API
export const checkSubscriptionStatus = async (subscriptionId: string): Promise<any> => {
  const { supabase } = await import('../lib/supabase')
  const { data, error } = await supabase.functions.invoke('verify-razorpay-subscription', {
    body: { subscription_id: subscriptionId },
  })
  if (error) throw error
  return data
}
