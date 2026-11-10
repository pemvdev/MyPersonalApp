import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useAuth() {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let isActive = true
    const client = supabase
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!isActive) return
      if (event === 'SIGNED_OUT') queryClient.clear()
      setSession(nextSession)
    })

    void client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!isActive) return
        const params = new URLSearchParams(window.location.search)
        const fragment = new URLSearchParams(window.location.hash.slice(1))
        if (
          sessionError ||
          params.has('error') ||
          fragment.has('error') ||
          (params.has('code') && !data.session)
        ) {
          setError('Google sign-in could not be completed. Please try again.')
        }
        if (
          params.has('code') ||
          params.has('error') ||
          fragment.has('error')
        ) {
          window.history.replaceState({}, '', window.location.pathname)
        }
        setSession(data.session)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isActive) return
        setError('Unable to restore your session. Please reload and try again.')
        setIsLoading(false)
      })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [queryClient])

  async function signIn() {
    if (!supabase || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch {
      setError('Unable to start Google sign-in. Please try again.')
      setIsSubmitting(false)
    }
  }

  async function signOut() {
    if (!supabase || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      queryClient.clear()
      setSession(null)
    } catch {
      setError('Unable to sign out. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return { session, isLoading, isSubmitting, error, signIn, signOut }
}
