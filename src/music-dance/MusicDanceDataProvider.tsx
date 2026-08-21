import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { mdKurumlariGetir, mdKurumOlustur, mdVerisiniGetir } from './service'
import { mdKasaIlkKurulum } from './cashService'
import type { MdKurumSecenegi, MdUrunProfili, MusicDanceData } from './types'

type MusicDanceCtx = {
  session: Session | null
  user: User | null
  kurumlar: MdKurumSecenegi[]
  aktifKurum: MdKurumSecenegi | null
  data: MusicDanceData | null
  loading: boolean
  refreshing: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  kurumSec: (kurumId: string) => void
  kurumOlustur: (kurumAdi: string, profil: MdUrunProfili) => Promise<void>
}

const Ctx = createContext<MusicDanceCtx | null>(null)
const KURUM_KEY = 'bs-md-aktif-kurum'

export function MusicDanceDataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [kurumlar, setKurumlar] = useState<MdKurumSecenegi[]>([])
  const [aktifKurumId, setAktifKurumId] = useState<string | null>(() => localStorage.getItem(KURUM_KEY))
  const [data, setData] = useState<MusicDanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aktifKurum = useMemo(() => kurumlar.find(x => x.kurum_id === aktifKurumId) || kurumlar[0] || null, [kurumlar, aktifKurumId])

  const kurumlariYenile = useCallback(async (tercih?: string | null) => {
    const next = await mdKurumlariGetir()
    setKurumlar(next)
    const wanted = tercih || localStorage.getItem(KURUM_KEY)
    const selected = next.find(x => x.kurum_id === wanted)?.kurum_id || next[0]?.kurum_id || null
    setAktifKurumId(selected)
    if (selected) localStorage.setItem(KURUM_KEY, selected)
    else localStorage.removeItem(KURUM_KEY)
    return selected
  }, [])

  const refreshFor = useCallback(async (kurumId: string | null) => {
    if (!session?.user || !kurumId) {
      setData(null)
      return
    }
    setRefreshing(true)
    try {
      setData(await mdVerisiniGetir(kurumId))
      setError(null)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [session?.user?.id])

  const refresh = useCallback(async () => {
    await refreshFor(aktifKurum?.kurum_id || null)
  }, [aktifKurum?.kurum_id, refreshFor])

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data: authData }) => {
      if (!mounted) return
      setSession(authData.session)
      if (!authData.session) setLoading(false)
    })
    const { data: auth } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setError(null)
      if (!next) {
        setKurumlar([])
        setData(null)
        setLoading(false)
      } else {
        setLoading(true)
      }
    })
    return () => { mounted = false; auth.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    let active = true
    setLoading(true)
    void kurumlariYenile()
      .then(selected => {
        if (!active) return
        if (!selected) setLoading(false)
      })
      .catch((e: any) => {
        if (!active) return
        setError(e?.message || String(e))
        setLoading(false)
      })
    return () => { active = false }
  }, [session?.user?.id, kurumlariYenile])

  useEffect(() => {
    if (!session?.user || !aktifKurum?.kurum_id) return
    void refreshFor(aktifKurum.kurum_id)
  }, [session?.user?.id, aktifKurum?.kurum_id, refreshFor])

  const kurumSec = useCallback((kurumId: string) => {
    if (!kurumlar.some(x => x.kurum_id === kurumId)) return
    localStorage.setItem(KURUM_KEY, kurumId)
    setAktifKurumId(kurumId)
    setLoading(true)
  }, [kurumlar])

  const kurumOlustur = useCallback(async (kurumAdi: string, profil: MdUrunProfili) => {
    if (!session?.user) throw new Error('Kurum oluşturmak için giriş yapmalısınız.')
    setRefreshing(true)
    try {
      const kurumId = await mdKurumOlustur(kurumAdi, profil, session.user.id)
      await mdKasaIlkKurulum(kurumId)
      await kurumlariYenile(kurumId)
      setError(null)
    } catch (e: any) {
      setError(e?.message || String(e))
      throw e
    } finally {
      setRefreshing(false)
    }
  }, [session?.user?.id, kurumlariYenile])

  const signIn = useCallback(async () => {
    setError(null)
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (authError) throw authError
  }, [])

  const signOut = useCallback(async () => {
    setData(null)
    setKurumlar([])
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<MusicDanceCtx>(() => ({
    session,
    user: session?.user || null,
    kurumlar,
    aktifKurum,
    data,
    loading,
    refreshing,
    error,
    signIn,
    signOut,
    refresh,
    kurumSec,
    kurumOlustur,
  }), [session, kurumlar, aktifKurum, data, loading, refreshing, error, signIn, signOut, refresh, kurumSec, kurumOlustur])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMusicDanceData() {
  const value = useContext(Ctx)
  if (!value) throw new Error('MusicDanceDataProvider bulunamadı.')
  return value
}
