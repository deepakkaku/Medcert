import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import posthog from 'posthog-js'
import { supabase } from '../lib/supabase'
import { UserProfile, ClinicSettings } from '../types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  clinic: ClinicSettings | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshClinic: () => Promise<void>
  updateClinic: (data: Partial<ClinicSettings>) => Promise<void>
  completeWalkthrough: () => Promise<void>
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [clinic, setClinic] = useState<ClinicSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Don't let data fetching block the UI loader
      const [profileRes, clinicRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('clinics').select('*').eq('user_id', userId).maybeSingle()
      ])

      if (profileRes.data) {
        const profileData = profileRes.data as UserProfile
        setProfile(profileData)
        
        // Identify user in PostHog
        posthog.identify(userId, {
          email: profileData.email,
          full_name: profileData.full_name,
          role: profileData.role
        })
      }
      
      if (clinicRes.data) {
        const clinicData = clinicRes.data as ClinicSettings
        setClinic(clinicData)
        
        // Add clinic info to PostHog
        posthog.group('clinic', clinicData.id, {
          name: clinicData.name,
          plan: clinicData.subscription_plan
        })
      }
      
      if (profileRes.error) console.error('Profile fetch error:', profileRes.error)
      if (clinicRes.error) console.error('Clinic fetch error:', clinicRes.error)
    } catch (err) {
      console.error('UserData error:', err)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) setIsLoading(false)
    }, 8000)

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (!mounted) return

        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        
        // Start fetching but don't AWAIT it here to avoid blocking initial render
        if (initialSession?.user) {
          fetchUserData(initialSession.user.id)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (mounted) {
          setIsLoading(false)
          clearTimeout(timeout)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth event:', event)
      if (!mounted) return

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        // Fetch in background
        fetchUserData(currentSession.user.id)
      } else {
        setProfile(null)
        setClinic(null)
        posthog.reset()
      }

      // Always clear loader on any event
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [fetchUserData])

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'consent' }
        }
      })
      if (error) throw error
    } catch (err) {
      console.error('Login error:', err)
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)
      setSession(null)
      setUser(null)
      setProfile(null)
      setClinic(null)
      posthog.reset()
      localStorage.clear() 
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Signout error:', err)
    } finally {
      setIsLoading(false)
      window.location.href = '/login'
    }
  }, [])

  const refreshClinic = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) setClinic(data as ClinicSettings)
  }, [user])

  const updateClinic = useCallback(async (data: Partial<ClinicSettings>) => {
    if (!user || !clinic) return
    const { data: updated, error } = await supabase
      .from('clinics')
      .update(data)
      .eq('user_id', user.id)
      .select()
      .single()
    if (!error && updated) {
      setClinic(updated as ClinicSettings)
    }
  }, [user, clinic])

  const completeWalkthrough = useCallback(async () => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ has_completed_walkthrough: true })
      .eq('id', user.id)
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, has_completed_walkthrough: true } : null)
    }
  }, [user])

  const value = React.useMemo(() => ({
    session,
    user,
    profile,
    clinic,
    isLoading,
    signInWithGoogle,
    signOut,
    refreshClinic,
    updateClinic,
    completeWalkthrough,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  }), [session, user, profile, clinic, isLoading, signInWithGoogle, signOut, refreshClinic, updateClinic, completeWalkthrough, isMobileMenuOpen])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
