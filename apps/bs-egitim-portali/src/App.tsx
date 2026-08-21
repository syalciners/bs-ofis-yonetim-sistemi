import type { Session } from '@supabase/supabase-js'
import {
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Video,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

type Tab = 'bugun' | 'hafta' | 'program' | 'odevler' | 'profil'

type PortalProfile = {
  rol: 'Öğrenci' | 'Öğretmen'
  ad_soyad: string
  email: string
}

type Lesson = {
  ders_id: string
  tarih: string
  baslangic_saati?: string | null
  bitis_saati?: string | null
  ders_durumu?: string | null
  brans_adi?: string | null
  derslik_adi?: string | null
  ogrenci_adi?: string | null
  ogretmen_adi?: string | null
  zoom_katilim_baglantisi?: string | null
}

type Assignment = {
  odev_id: string
  odev_basligi?: string | null
  odev_aciklamasi?: string | null
  aciklama?: string | null
  verilis_tarihi?: string | null
  son_teslim_tarihi?: string | null
  durum: string
  oncelik?: string | null
  ogrenci_adi?: string | null
  ogretmen_adi?: string | null
  odev_dosya_linki?: string | null
  odev_fotograf_linki?: string | null
  ogretmen_notu?: string | null
  puan?: string | null
  grup?: 'Geciken' | 'Bugün' | 'Yaklaşan'
  kitap_adi?: string | null
  calisma_turu?: string | null
  baslangic_no?: number | null
  bitis_no?: number | null
  calisma_detayi?: string | null
}

type StudentToday = {
  rol: 'Öğrenci'
  ogrenci_adi: string
  tarih: string
  ozet: { geciken: number; bugun: number; yaklasan: number }
  dersler: Lesson[]
  calismalar: Assignment[]
}

type PortalData = {
  profile: PortalProfile
  todayLessons: Lesson[]
  studentToday: StudentToday | null
  program: Lesson[]
  assignments: Assignment[]
}

function trDate(value?: string | null, long = false) {
  if (!value) return 'Tarih yok'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat('tr-TR', long
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10)
}

function time(value?: string | null) {
  return value ? value.slice(0, 5) : '—'
}

function assignmentTitle(item: Assignment) {
  return item.odev_basligi?.trim() || item.calisma_detayi?.trim() || 'Çalışma'
}

function assignmentDetail(item: Assignment) {
  if (item.kitap_adi && item.calisma_turu && item.baslangic_no != null) {
    const range = item.bitis_no != null ? `${item.baslangic_no}–${item.bitis_no}` : String(item.baslangic_no)
    return `${item.kitap_adi} · ${item.calisma_turu} ${range}`
  }
  return item.aciklama || item.odev_aciklamasi || item.ogretmen_adi || ''
}

function isDone(status: string) {
  return ['Tamamlandı', 'Teslim Edildi'].includes(status)
}

function friendlyError(message: string) {
  if (message.includes('yönetim') || message.includes('Yönetim')) return 'Bu hesap yönetim uygulamasına aittir. Portal için öğrenci veya öğretmen hesabıyla giriş yapın.'
  if (message.includes('aktif öğrenci veya öğretmen')) return 'Bu Google hesabı aktif öğrenci veya öğretmen kaydıyla eşleşmiyor.'
  if (message.includes('birden fazla')) return 'Bu e-posta birden fazla kişiyle eşleşiyor. Kurum yöneticinizden kaydı kontrol etmesini isteyin.'
  if (message.includes('size ait değil')) return 'Bu çalışma hesabınıza ait değil.'
  return message || 'İşlem tamamlanamadı.'
}

async function rpc<T>(name: string, params?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw new Error(error.message)
  return data as T
}

async function loadPortalData(): Promise<PortalData> {
  const profile = await rpc<PortalProfile>('portal_oturum_bilgisi_v2')
  const [program, assignments] = await Promise.all([
    rpc<Lesson[]>('portal_program_v2', { p_gun: 30 }),
    rpc<Assignment[]>('portal_odevler_v2'),
  ])

  if (profile.rol === 'Öğrenci') {
    const studentToday = await rpc<StudentToday>('portal_ogrenci_bugun_v1')
    return { profile, todayLessons: studentToday.dersler || [], studentToday, program: program || [], assignments: assignments || [] }
  }

  const todayLessons = await rpc<Lesson[]>('portal_bugun_v2')
  return { profile, todayLessons: todayLessons || [], studentToday: null, program: program || [], assignments: assignments || [] }
}

function Login({ error, onLogin }: { error: string | null; onLogin: () => void }) {
  return <main className="login-screen">
    <section className="login-card">
      <div className="brand-mark">BS</div>
      <span className="eyebrow">BS EĞİTİM PORTALI</span>
      <h1>Bugünün planı,<br />tek ekranda.</h1>
      <p>Öğrenciler kendi program ve çalışmalarını, öğretmenler kendi ders akışını güvenli kurum hesabıyla görür.</p>
      <button className="primary" onClick={onLogin}>Google ile Giriş Yap</button>
      {error && <div className="error-box">{error}</div>}
      <small><ShieldCheck /> Finans bilgileri portalda gösterilmez.</small>
    </section>
  </main>
}

function LessonList({ lessons, role }: { lessons: Lesson[]; role: PortalProfile['rol'] }) {
  if (!lessons.length) return <div className="empty"><CheckCircle2 /><b>Planlanmış ders yok.</b><span>Yeni bir ders oluştuğunda burada görünecek.</span></div>
  return <div className="lesson-list">{lessons.map(item => <article className="lesson-card" key={item.ders_id}>
    <div className="lesson-time"><strong>{time(item.baslangic_saati)}</strong><span>{time(item.bitis_saati)}</span></div>
    <div className="lesson-copy">
      <h3>{item.brans_adi || 'Ders'}</h3>
      <p>{role === 'Öğrenci' ? item.ogretmen_adi : item.ogrenci_adi}</p>
      <small>{item.derslik_adi || item.ders_durumu || 'Ders bilgisi'}</small>
    </div>
    {item.zoom_katilim_baglantisi && <a className="zoom" href={item.zoom_katilim_baglantisi} target="_blank" rel="noreferrer"><Video /> Katıl</a>}
  </article>)}</div>
}

function StudentTodayView({ data, busyId, onComplete, onWeek }: { data: PortalData; busyId: string; onComplete: (id: string) => void; onWeek: () => void }) {
  const today = data.studentToday!
  const groups = ['Geciken', 'Bugün', 'Yaklaşan'] as const
  return <div className="page-stack">
    <section className="today-hero student-today-premium">
      <div><span className="eyebrow">BUGÜN · {trDate(today.tarih, true).toLocaleUpperCase('tr-TR')}</span><h1>Merhaba, {data.profile.ad_soyad.split(' ')[0]}.</h1><p>Önce tamamlanması gerekenleri gösteriyoruz; geri kalan bilgi gerektiği yerde hazır.</p><button className="week-link" onClick={onWeek}><CalendarRange /> Haftayı Gör <ChevronRight /></button></div>
      <div className="today-summary">
        <span className={today.ozet.geciken ? 'danger' : ''}><b>{today.ozet.geciken}</b><small>Geciken</small></span>
        <span><b>{today.ozet.bugun}</b><small>Bugün</small></span>
        <span><b>{today.ozet.yaklasan}</b><small>Yaklaşan</small></span>
      </div>
    </section>

    <section className="panel">
      <div className="section-head"><div><span>ÇALIŞMALAR</span><h2>Önce bunları tamamla</h2></div></div>
      {!today.calismalar.length ? <div className="empty success"><CheckCircle2 /><b>Güncel çalışmalar tamam.</b><span>Yeni bir çalışma verildiğinde burada görünecek.</span></div> : <div className="study-groups">
        {groups.map(group => {
          const rows = today.calismalar.filter(item => item.grup === group)
          if (!rows.length) return null
          return <div className="study-group" key={group}>
            <h3 className={group === 'Geciken' ? 'danger-text' : ''}>{group}</h3>
            {rows.map(item => <article className={`study-card ${group === 'Geciken' ? 'overdue' : ''}`} key={item.odev_id}>
              <div className="study-icon"><BookOpenCheck /></div>
              <div className="study-copy"><b>{assignmentTitle(item)}</b><span>{assignmentDetail(item)}</span><small>Son teslim: {trDate(item.son_teslim_tarihi)}</small></div>
              <button className="done-button" disabled={busyId === item.odev_id} onClick={() => onComplete(item.odev_id)}><Check /> {busyId === item.odev_id ? 'Kaydediliyor…' : 'Tamamladım'}</button>
            </article>)}
          </div>
        })}
      </div>}
    </section>

    <section className="panel">
      <div className="section-head"><div><span>DERSLER</span><h2>Bugünkü program</h2></div><small>{today.dersler.length} ders</small></div>
      <LessonList lessons={today.dersler} role="Öğrenci" />
    </section>
  </div>
}

function StudentWeekView({ data, busyId, onComplete, onToday }: { data: PortalData; busyId: string; onComplete: (id: string) => void; onToday: () => void }) {
  const start = data.studentToday?.tarih || new Date().toISOString().slice(0, 10)
  const end = addDays(start, 6)
  const rows = data.assignments
    .filter(item => item.durum !== 'İptal' && Boolean(item.son_teslim_tarihi && item.son_teslim_tarihi >= start && item.son_teslim_tarihi <= end))
    .sort((a, b) => String(a.son_teslim_tarihi || '').localeCompare(String(b.son_teslim_tarihi || '')))
  const completed = rows.filter(item => isDone(item.durum)).length
  const percent = rows.length ? Math.round((completed / rows.length) * 100) : 0
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))

  return <div className="page-stack student-week-page">
    <section className="student-week-hero">
      <div className="student-week-copy"><span className="eyebrow">BU HAFTA · {trDate(start)} – {trDate(end)}</span><h1>Haftanın planı hazır.</h1><p>Bugün ne yapacağını düşünmene gerek yok. Planı gün gün tamamla; kalanları sistem takip etsin.</p><button onClick={onToday}>Bugüne dön</button></div>
      <div className="student-week-progress"><div className="progress-ring"><b>%{percent}</b><span>Tamamlandı</span></div><div><strong>{completed}/{rows.length}</strong><span>çalışma tamamlandı</span></div></div>
    </section>

    {!rows.length ? <div className="empty success"><CheckCircle2 /><b>Bu hafta için çalışma yok.</b><span>Koçunuz yeni bir plan yayınladığında burada gün gün görünecek.</span></div> : <section className="student-week-board">
      {days.map(date => {
        const dayRows = rows.filter(item => item.son_teslim_tarihi === date)
        return <article className={`student-week-day ${date === start ? 'today' : ''}`} key={date}>
          <header><div><span>{trDate(date, true)}</span><b>{date === start ? 'Bugün' : trDate(date)}</b></div><em>{dayRows.filter(item => isDone(item.durum)).length}/{dayRows.length}</em></header>
          <div className="student-week-items">
            {dayRows.length ? dayRows.map(item => {
              const completedItem = isDone(item.durum)
              return <div className={`student-week-item ${completedItem ? 'done' : ''}`} key={item.odev_id}>
                <div className="week-item-icon">{completedItem ? <CheckCircle2 /> : <BookOpenCheck />}</div>
                <div><b>{assignmentTitle(item)}</b><span>{assignmentDetail(item)}</span><small>{completedItem ? 'Tamamlandı' : 'Planlı çalışma'}</small></div>
                {!completedItem && <button disabled={busyId === item.odev_id} onClick={() => onComplete(item.odev_id)}><Check /> {busyId === item.odev_id ? 'Kaydediliyor…' : 'Tamamladım'}</button>}
              </div>
            }) : <div className="student-week-rest"><CheckCircle2 /><span>Planlı çalışma yok</span></div>}
          </div>
        </article>
      })}
    </section>}
  </div>
}

function TeacherTodayView({ data }: { data: PortalData }) {
  return <div className="page-stack">
    <section className="today-hero compact">
      <div><span className="eyebrow">BUGÜN</span><h1>Merhaba, {data.profile.ad_soyad.split(' ')[0]}.</h1><p>Bugünkü ders akışınız saat sırasıyla hazır.</p></div>
      <div className="single-count"><b>{data.todayLessons.length}</b><span>Bugünkü ders</span></div>
    </section>
    <section className="panel"><div className="section-head"><div><span>PROGRAM</span><h2>Bugünkü dersler</h2></div></div><LessonList lessons={data.todayLessons} role="Öğretmen" /></section>
  </div>
}

function Program({ data }: { data: PortalData }) {
  const grouped = useMemo(() => {
    const map = new Map<string, Lesson[]>()
    data.program.forEach(item => map.set(item.tarih, [...(map.get(item.tarih) || []), item]))
    return [...map.entries()]
  }, [data.program])
  return <div className="page-stack"><header className="page-title"><span className="eyebrow">PROGRAM</span><h1>Önümüzdeki 30 gün</h1><p>Dersler tarih ve saat sırasıyla gösterilir.</p></header>
    {!grouped.length ? <div className="empty"><CalendarDays /><b>Yaklaşan ders yok.</b><span>Program oluştuğunda burada görünecek.</span></div> : grouped.map(([date, lessons]) => <section className="panel" key={date}><div className="section-head"><div><span>{trDate(date, true).toLocaleUpperCase('tr-TR')}</span><h2>{trDate(date)}</h2></div><small>{lessons.length} ders</small></div><LessonList lessons={lessons} role={data.profile.rol} /></section>)}
  </div>
}

function Assignments({ data }: { data: PortalData }) {
  const rows = data.assignments.filter(x => x.durum !== 'İptal')
  return <div className="page-stack"><header className="page-title"><span className="eyebrow">ÇALIŞMALAR</span><h1>Ödevler</h1><p>Verilen ve tamamlanan çalışmaların geçmişi.</p></header>
    {!rows.length ? <div className="empty"><BookOpenCheck /><b>Ödev kaydı yok.</b><span>Yeni çalışma verildiğinde burada görünecek.</span></div> : <section className="panel assignment-history">{rows.map(item => <article key={item.odev_id}>
      <span className={`history-status ${item.durum === 'Tamamlandı' ? 'done' : ''}`}>{item.durum}</span>
      <div><b>{assignmentTitle(item)}</b><p>{item.odev_aciklamasi || item.ogretmen_adi || ''}</p><small>{trDate(item.verilis_tarihi)}{item.son_teslim_tarihi ? ` · Son teslim ${trDate(item.son_teslim_tarihi)}` : ''}</small></div>
    </article>)}</section>}
  </div>
}

function Profile({ data, onSignOut }: { data: PortalData; onSignOut: () => void }) {
  return <div className="page-stack"><header className="page-title"><span className="eyebrow">PROFİL</span><h1>Hesabım</h1><p>Portal kimliğiniz doğrulanmış Google hesabınızla eşleştirilir.</p></header>
    <section className="profile-card"><div className="profile-avatar"><UserRound /></div><div><span>{data.profile.rol}</span><h2>{data.profile.ad_soyad}</h2><p>{data.profile.email}</p></div><button onClick={onSignOut}><LogOut /> Çıkış Yap</button></section>
    <div className="privacy-note"><ShieldCheck /><div><b>Yalnız eğitim bilgileri</b><span>Bu portal finans, tahsilat veya kurum yönetim bilgilerini göstermez.</span></div></div>
  </div>
}

function Shell({ data, onRefresh, onSignOut }: { data: PortalData; onRefresh: () => void; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('bugun')
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const complete = async (id: string) => {
    if (busyId) return
    setBusyId(id)
    setMessage(null)
    try {
      await rpc('portal_ogrenci_odev_tamamla_v1', { p_odev_id: id })
      setMessage('Çalışma tamamlandı.')
      onRefresh()
    } catch (error) {
      setMessage(friendlyError(error instanceof Error ? error.message : String(error)))
    } finally {
      setBusyId('')
    }
  }

  const nav = [
    { id: 'bugun' as const, label: 'Bugün', Icon: Clock3 },
    { id: 'program' as const, label: 'Program', Icon: CalendarDays },
    { id: 'odevler' as const, label: 'Ödevler', Icon: BookOpenCheck },
    { id: 'profil' as const, label: 'Profil', Icon: UserRound },
  ]

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark small">BS</div><div><b>BS Eğitim</b><span>Portal</span></div></div><div className="top-actions"><span>{data.profile.rol}</span><button onClick={onRefresh} aria-label="Yenile"><RefreshCw /></button></div></header>
    <main className="container">
      {message && <div className="toast"><CheckCircle2 />{message}</div>}
      {tab === 'bugun' && (data.profile.rol === 'Öğrenci' ? <StudentTodayView data={data} busyId={busyId} onComplete={id => void complete(id)} onWeek={() => setTab('hafta')} /> : <TeacherTodayView data={data} />)}
      {tab === 'hafta' && data.profile.rol === 'Öğrenci' && <StudentWeekView data={data} busyId={busyId} onComplete={id => void complete(id)} onToday={() => setTab('bugun')} />}
      {tab === 'program' && <Program data={data} />}
      {tab === 'odevler' && <Assignments data={data} />}
      {tab === 'profil' && <Profile data={data} onSignOut={onSignOut} />}
    </main>
    <nav className="bottom-nav" aria-label="Portal menüsü">{nav.map(({ id, label, Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon /><span>{label}</span></button>)}</nav>
  </div>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user) return
    setLoading(true)
    try {
      setData(await loadPortalData())
      setError(null)
    } catch (err) {
      setData(null)
      setError(friendlyError(err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let live = true
    const applySession = (next: Session | null) => {
      if (!live) return
      setSession(current => current?.access_token === next?.access_token ? current : next)
      setAuthReady(true)
    }

    void supabase.auth.getSession().then(({ data: auth }) => applySession(auth.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => applySession(next))

    return () => {
      live = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (!session?.user) {
      setData(null)
      setLoading(false)
      return
    }

    let live = true
    const initial = window.setTimeout(() => {
      if (live) void refresh(session)
    }, 0)

    return () => {
      live = false
      window.clearTimeout(initial)
    }
  }, [authReady, session, refresh])

  const login = async () => {
    setError(null)
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (authError) setError(authError.message)
  }

  if (loading) return <main className="boot"><div className="brand-mark">BS</div><b>Portal hazırlanıyor…</b></main>
  if (!session) return <Login error={error} onLogin={() => void login()} />
  if (!data) return <main className="boot error-state"><div className="brand-mark">BS</div><b>Portal açılamadı</b><span>{error}</span><button className="primary" onClick={() => void supabase.auth.signOut()}>Farklı hesapla giriş</button></main>
  return <Shell data={data} onRefresh={() => void refresh(session)} onSignOut={() => void supabase.auth.signOut()} />
}
