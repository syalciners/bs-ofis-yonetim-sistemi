import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AppData, KullaniciProfili } from '../lib/types'
import { loadAppData, loadProfile, subscribeToChanges } from '../services/officeService'
import { loadInstitutionSettings, type KurumAyarlari } from '../services/institutionService'

interface AppCtx {
  session: Session | null
  user: User | null
  profile: KullaniciProfili | null
  institution: KurumAyarlari | null
  data: AppData | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}
const Ctx = createContext<AppCtx | null>(null)

const PORTAL_URL = 'https://bs-egitim-portali.vercel.app/'

function portalSessionUrl(session: Session) {
  const fragment = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: String(session.expires_in ?? 3600),
    token_type: session.token_type || 'bearer',
  })
  if (session.expires_at) fragment.set('expires_at', String(session.expires_at))
  return `${PORTAL_URL}#${fragment.toString()}`
}

async function redirectToPortalIfEligible(session: Session) {
  const { data, error } = await supabase.rpc('portal_oturum_bilgisi_v2')
  if (error || !data || typeof data !== 'object') return false

  const role = (data as { rol?: unknown }).rol
  if (role !== 'Öğrenci' && role !== 'Öğretmen') return false

  window.location.replace(portalSessionUrl(session))
  return true
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<KullaniciProfili | null>(null)
  const [institution, setInstitution] = useState<KurumAyarlari | null>(null)
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!session?.user) return
    setRefreshing(true)
    try {
      const [nextData, nextProfile, nextInstitution] = await Promise.all([
        loadAppData(),
        loadProfile(session.user.id),
        loadInstitutionSettings(),
      ])
      if (!nextProfile?.aktif) {
        const redirected = await redirectToPortalIfEligible(session)
        if (redirected) return
        throw new Error('Bu kullanıcı hesabı uygulama için aktif değil.')
      }
      setData(nextData)
      setProfile(nextProfile as KullaniciProfili)
      setInstitution(nextInstitution)
      setError(null)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally { setRefreshing(false); setLoading(false) }
  }, [session])

  useEffect(() => {
    let mounted = true
    void loadInstitutionSettings().then(next => { if (mounted) setInstitution(next) }).catch(() => undefined)
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

  const value = useMemo<AppCtx>(() => ({ session, user: session?.user || null, profile, institution, data, loading, refreshing, error, refresh, signIn, signOut }), [session, profile, institution, data, loading, refreshing, error, refresh, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('AppDataProvider bulunamadı')
  return v
}
