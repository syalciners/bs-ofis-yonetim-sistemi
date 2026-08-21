import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { APP_MODE, supabase } from '../lib/supabase'
import type { AppData, KullaniciProfili } from '../lib/types'
import { loadAppData, loadProfile, subscribeToChanges } from '../services/officeService'
import { loadUnreadNotificationCount } from '../services/notificationService'

interface DemoInstitutionSettings {
  takvim_baslangic_saati?: string | null
  takvim_bitis_saati?: string | null
  varsayilan_ders_birimi?: number | null
}

interface AppCtx {
  session: Session | null
  user: User | null
  profile: KullaniciProfili | null
  institution: DemoInstitutionSettings | null
  data: AppData | null
  loading: boolean
  refreshing: boolean
  error: string | null
  demoExpiresAt: string | null
  unreadNotifications: number
  refresh: () => Promise<void>
  refreshNotifications: () => Promise<void>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}
const Ctx = createContext<AppCtx | null>(null)
const IS_DEMO = APP_MODE === 'demo'
const PORTAL_URL = 'https://bs-egitim-portali.vercel.app/'
const DEMO_INSTITUTION: DemoInstitutionSettings = {
  takvim_baslangic_saati: '08:00',
  takvim_bitis_saati: '21:00',
  varsayilan_ders_birimi: 1,
}

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
  if (IS_DEMO) return false
  const { data, error } = await supabase.rpc('portal_oturum_bilgisi_v2')
  if (error || !data || typeof data !== 'object') return false
  const role = (data as { rol?: unknown }).rol
  if (role !== 'Öğrenci' && role !== 'Öğretmen') return false
  window.location.replace(portalSessionUrl(session))
  return true
}

async function ensureDemoSession(): Promise<string | null> {
  const { data, error } = await supabase.rpc('demo_oturum_baslat_v1')
  if (error) {
    const message = String(error.message || '')
    if (error.code === 'PGRST202' || message.includes('Could not find the function')) return null
    throw error
  }
  if (!data || typeof data !== 'object') return null
  const expires = (data as { bitis_zamani?: unknown }).bitis_zamani
  return typeof expires === 'string' ? expires : null
}

async function captureDemoSource() {
  if (!IS_DEMO) return
  const params = new URLSearchParams(window.location.search)
  const payload = {
    p_utm_source: params.get('utm_source'),
    p_utm_medium: params.get('utm_medium'),
    p_utm_campaign: params.get('utm_campaign'),
    p_utm_content: params.get('utm_content'),
    p_utm_term: params.get('utm_term'),
    p_referer: document.referrer || null,
    p_landing_path: `${window.location.pathname}${window.location.search}`,
  }
  const { error } = await supabase.rpc('demo_oturum_kaynak_guncelle_v1', payload)
  if (error && error.code !== 'PGRST202') console.warn('Demo kaynak bilgisi kaydedilemedi:', error.message)
}

function demoProfile(user: User): KullaniciProfili {
  return {
    auth_user_id: user.id,
    email: 'demo@bsegitim.local',
    ad_soyad: 'Demo Yönetici',
    rol: 'Yönetici',
    ogretmen_id: null,
    aktif: true,
    telefon: null,
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<KullaniciProfili | null>(null)
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const timer = useRef<number | null>(null)

  const refreshNotifications = useCallback(async () => {
    if (!session?.user) {
      setUnreadNotifications(0)
      return
    }
    try {
      setUnreadNotifications(await loadUnreadNotificationCount())
    } catch {
      setUnreadNotifications(0)
    }
  }, [session?.user?.id])

  const refresh = useCallback(async () => {
    if (!session?.user) return
    setRefreshing(true)
    try {
      if (IS_DEMO && session.user.is_anonymous) {
        const expiresAt = await ensureDemoSession()
        if (expiresAt) setDemoExpiresAt(expiresAt)
        await captureDemoSource()
        const [nextData, nextUnread] = await Promise.all([
          loadAppData(),
          loadUnreadNotificationCount().catch(() => 0),
        ])
        setData(nextData)
        setProfile(demoProfile(session.user))
        setUnreadNotifications(nextUnread)
        setError(null)
        return
      }
      const nextProfile = await loadProfile(session.user.id)
      if (!nextProfile?.aktif) {
        const redirected = await redirectToPortalIfEligible(session)
        if (redirected) return
        throw new Error('Bu kullanıcı hesabı uygulama için aktif değil.')
      }
      const [nextData, nextUnread] = await Promise.all([
        loadAppData(),
        loadUnreadNotificationCount().catch(() => 0),
      ])
      setData(nextData)
      setProfile(nextProfile as KullaniciProfili)
      setUnreadNotifications(nextUnread)
      setError(null)
    } catch (e: any) {
      const message = e?.message || String(e)
      if (IS_DEMO && (message.includes('DEMO_SURE_DOLDU') || message.includes('Demo süresi doldu'))) {
        setError('Demo süreniz doldu. Yeni ve temiz bir demo oturumu açabilirsiniz.')
        setData(null)
        setProfile(null)
        setDemoExpiresAt(null)
        setUnreadNotifications(0)
        await supabase.auth.signOut()
      } else if (IS_DEMO && message.includes('DEMO_KAPASITE_DOLU')) {
        setError('Demo şu anda yoğun. Lütfen birkaç dakika sonra tekrar deneyin.')
        setData(null)
        setProfile(null)
        setDemoExpiresAt(null)
        setUnreadNotifications(0)
        await supabase.auth.signOut()
      } else {
        setError(message)
      }
    } finally { setRefreshing(false); setLoading(false) }
  }, [session])

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); if (!data.session) setLoading(false) } })
    const { data: auth } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(!next)
      if (!next) { setData(null); setProfile(null); setDemoExpiresAt(null); setUnreadNotifications(0) }
    })
    return () => { mounted = false; auth.subscription.unsubscribe() }
  }, [])

  useEffect(() => { if (session?.user) void refresh() }, [session?.user?.id, refresh])

  useEffect(() => {
    if (!IS_DEMO || !session?.user?.is_anonymous || !demoExpiresAt) return
    const tick = () => {
      if (Date.now() < new Date(demoExpiresAt).getTime()) return
      setError('Demo süreniz doldu. Yeni ve temiz bir demo oturumu açabilirsiniz.')
      setData(null)
      setProfile(null)
      setDemoExpiresAt(null)
      setUnreadNotifications(0)
      void supabase.auth.signOut()
    }
    tick()
    const id = window.setInterval(tick, 15000)
    return () => window.clearInterval(id)
  }, [session?.user?.id, session?.user?.is_anonymous, demoExpiresAt])

  useEffect(() => {
    if (!session?.user) return
    const off = subscribeToChanges(() => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void refresh(), 350)
    })
    return () => { off(); if (timer.current) window.clearTimeout(timer.current) }
  }, [session?.user?.id, refresh])

  const signIn = useCallback(async () => {
    setError(null)
    if (IS_DEMO) {
      const { error } = await supabase.auth.signInAnonymously({ options: { data: { uygulama: 'BS Eğitim Demo' } } })
      if (error) throw error
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href.split('#')[0] } })
    if (error) throw error
  }, [])
  const signOut = useCallback(async () => { setDemoExpiresAt(null); setUnreadNotifications(0); await supabase.auth.signOut() }, [])

  const value = useMemo<AppCtx>(() => ({ session, user: session?.user || null, profile, institution: IS_DEMO ? DEMO_INSTITUTION : null, data, loading, refreshing, error, demoExpiresAt, unreadNotifications, refresh, refreshNotifications, signIn, signOut }), [session, profile, data, loading, refreshing, error, demoExpiresAt, unreadNotifications, refresh, refreshNotifications, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('AppDataProvider bulunamadı')
  return v
}
