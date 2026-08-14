import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AppData, KullaniciProfili } from '../lib/types'
import { loadAppData, loadProfile, subscribeToChanges } from '../services/officeService'

interface AppCtx {
  session: Session | null
  user: User | null
  profile: KullaniciProfili | null
  data: AppData | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}
const Ctx = createContext<AppCtx | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<KullaniciProfili | null>(null)
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!session?.user) return
    setRefreshing(true)
    try {
      const [nextData, nextProfile] = await Promise.all([loadAppData(), loadProfile(session.user.id)])
      if (!nextProfile?.aktif) throw new Error('Bu kullanıcı hesabı uygulama için aktif değil.')
      setData(nextData)
      setProfile(nextProfile as KullaniciProfili)
      setError(null)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally { setRefreshing(false); setLoading(false) }
  }, [session])

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); if (!data.session) setLoading(false) } })
    const { data: auth } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(!next); if (!next) { setData(null); setProfile(null) } })
    return () => { mounted = false; auth.subscription.unsubscribe() }
  }, [])

  useEffect(() => { if (session?.user) void refresh() }, [session?.user?.id, refresh])

  useEffect(() => {
    if (!session?.user) return
    const off = subscribeToChanges(() => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void refresh(), 350)
    })
    return () => { off(); if (timer.current) window.clearTimeout(timer.current) }
  }, [session?.user?.id, refresh])

  const signIn = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href.split('#')[0] } })
    if (error) throw error
  }, [])
  const signOut = useCallback(async () => { await supabase.auth.signOut() }, [])

  const value = useMemo<AppCtx>(() => ({ session, user: session?.user || null, profile, data, loading, refreshing, error, refresh, signIn, signOut }), [session, profile, data, loading, refreshing, error, refresh, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('AppDataProvider bulunamadı')
  return v
}
