import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Clock3,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Video,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import type { PortalAssignment, PortalLesson, PortalProfile } from './lib/types'
import { loadAssignments, loadPortalProfile, loadProgram, loadTodayLessons } from './services/portalService'

type Tab = 'bugun' | 'program' | 'odevler' | 'profil'

function formatDate(value: string, long = false) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('tr-TR', long
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'short', weekday: 'short' }).format(date)
}

function formatTime(value: string | null) {
  if (!value) return '—'
  return value.slice(0, 5)
}

function roleCopy(role: PortalProfile['rol']) {
  return role === 'Öğretmen' ? 'Öğretmen Portalı' : 'Öğrenci Portalı'
}

function LoginScreen({ busy, error, onLogin }: { busy: boolean; error: string | null; onLogin: () => Promise<void> }) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark" aria-hidden="true"><span>BS</span><i /></div>
        <div className="eyebrow">BS EĞİTİM</div>
        <h1>Portal</h1>
        <p className="login-copy">Ders programınızı ve ödevlerinizi sade, güvenli ve tek bir ekrandan görüntüleyin.</p>
        <button className="primary-button" disabled={busy} onClick={() => void onLogin()}>
          {busy ? <LoaderCircle className="spin" size={19} /> : <LogIn size={19} />}
          {busy ? 'Yönlendiriliyor…' : 'Google ile Giriş Yap'}
        </button>
        <div className="security-note"><ShieldCheck size={16} /> Yalnız kurum tarafından yetkilendirilen hesaplar erişebilir.</div>
        {error && <div className="error-box">{error}</div>}
      </section>
    </main>
  )
}

function ReadOnlyPill() {
  return <span className="readonly-pill"><LockKeyhole size={13} /> Salt okunur</span>
}

function LessonList({ items, emptyText }: { items: PortalLesson[]; emptyText: string }) {
  if (!items.length) return <div className="empty-state"><CalendarDays size={27} /><strong>{emptyText}</strong><span>Yeni kayıt oluştuğunda burada görünecek.</span></div>

  return <div className="lesson-list">{items.map((lesson) => (
    <article className="lesson-card" key={lesson.ders_id}>
      <div className="lesson-time"><strong>{formatTime(lesson.baslangic_saati)}</strong><span>{formatTime(lesson.bitis_saati)}</span></div>
      <div className="lesson-main">
        <div className="lesson-heading"><strong>{lesson.brans_adi || 'Ders'}</strong><span className="status-badge">{lesson.ders_durumu || 'Planlandı'}</span></div>
        <div className="lesson-meta">
          <span>{lesson.ogrenci_adi && lesson.ogretmen_adi ? `${lesson.ogrenci_adi} · ${lesson.ogretmen_adi}` : lesson.ogrenci_adi || lesson.ogretmen_adi || '—'}</span>
          <span>{lesson.derslik_adi || 'Ders yeri belirtilmedi'}</span>
        </div>
      </div>
      {lesson.zoom_katilim_baglantisi && (
        <a className="zoom-button" href={lesson.zoom_katilim_baglantisi} target="_blank" rel="noreferrer" aria-label="Zoom dersine katıl"><Video size={17} /></a>
      )}
    </article>
  ))}</div>
}

function TodayPage({ profile, lessons }: { profile: PortalProfile; lessons: PortalLesson[] }) {
  const today = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return <>
    <section className="hero-card">
      <div>
        <span className="hero-kicker">{roleCopy(profile.rol)}</span>
        <h2>Merhaba, {profile.ad_soyad.split(' ')[0]}</h2>
        <p>{today}</p>
      </div>
      <div className="hero-icon">{profile.rol === 'Öğretmen' ? <GraduationCap size={30} /> : <BookOpenCheck size={29} />}</div>
    </section>

    <section className="section-block">
      <div className="section-title"><div><span>Günün akışı</span><h3>Bugünkü dersler</h3></div><ReadOnlyPill /></div>
      <LessonList items={lessons} emptyText="Bugün planlanmış ders yok" />
    </section>
  </>
}

function ProgramPage({ lessons }: { lessons: PortalLesson[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, PortalLesson[]>()
    for (const lesson of lessons) {
      const list = map.get(lesson.tarih) ?? []
      list.push(lesson)
      map.set(lesson.tarih, list)
    }
    return [...map.entries()]
  }, [lessons])

  return <section className="section-block page-section">
    <div className="page-heading"><div><span>Önümüzdeki 30 gün</span><h2>Programım</h2></div><ReadOnlyPill /></div>
    {!grouped.length ? <LessonList items={[]} emptyText="Yaklaşan ders bulunmuyor" /> : grouped.map(([date, dayLessons]) => (
      <div className="day-group" key={date}>
        <div className="day-label"><CalendarDays size={16} /><strong>{formatDate(date, true)}</strong></div>
        <LessonList items={dayLessons} emptyText="" />
      </div>
    ))}
  </section>
}

function AssignmentsPage({ items, role }: { items: PortalAssignment[]; role: PortalProfile['rol'] }) {
  return <section className="section-block page-section">
    <div className="page-heading"><div><span>{role === 'Öğretmen' ? 'Verilen ödevler' : 'Çalışma planı'}</span><h2>Ödevler</h2></div><ReadOnlyPill /></div>
    {!items.length ? <div className="empty-state"><BookOpenCheck size={27}/><strong>Aktif ödev bulunmuyor</strong><span>Ödev kayıtları burada görüntülenecek.</span></div> : (
      <div className="assignment-list">{items.map((item) => (
        <article className="assignment-card" key={item.odev_id}>
          <div className="assignment-top"><span className="assignment-status">{item.durum}</span>{item.oncelik && <span className="priority">{item.oncelik}</span>}</div>
          <h3>{item.odev_basligi || 'Ödev'}</h3>
          <p>{item.odev_aciklamasi || 'Açıklama eklenmemiş.'}</p>
          <div className="assignment-person">{role === 'Öğretmen' ? item.ogrenci_adi : item.ogretmen_adi}</div>
          <div className="assignment-footer">
            <span><Clock3 size={15}/>{item.son_teslim_tarihi ? `Son teslim ${formatDate(item.son_teslim_tarihi)}` : `Verildi ${formatDate(item.verilis_tarihi)}`}</span>
            {(item.odev_dosya_linki || item.odev_fotograf_linki) && <a href={item.odev_dosya_linki || item.odev_fotograf_linki || '#'} target="_blank" rel="noreferrer">Dosyayı aç <ChevronRight size={15}/></a>}
          </div>
          {(item.puan || item.ogretmen_notu) && <div className="feedback-box">{item.puan && <strong>Puan: {item.puan}</strong>}{item.ogretmen_notu && <span>{item.ogretmen_notu}</span>}</div>}
        </article>
      ))}</div>
    )}
  </section>
}

function ProfilePage({ profile, email, onLogout }: { profile: PortalProfile; email: string | null; onLogout: () => Promise<void> }) {
  return <section className="section-block page-section">
    <div className="page-heading"><div><span>Hesap ve erişim</span><h2>Profilim</h2></div><ReadOnlyPill /></div>
    <article className="profile-card">
      <div className="profile-avatar"><CircleUserRound size={34}/></div>
      <div className="profile-name"><strong>{profile.ad_soyad}</strong><span>{roleCopy(profile.rol)}</span></div>
      <div className="profile-rows">
        <div><span>Rol</span><strong>{profile.rol}</strong></div>
        <div><span>E-posta</span><strong>{email || profile.email || '—'}</strong></div>
        <div><span>Erişim</span><strong className="safe-text">Yalnız görüntüleme</strong></div>
      </div>
      <div className="permission-note"><ShieldCheck size={18}/><div><strong>Verileriniz korunuyor</strong><span>Bu portal üzerinden ders, ödev, öğrenci veya öğretmen kayıtları değiştirilemez.</span></div></div>
      <button className="secondary-button" onClick={() => void onLogout()}><LogOut size={18}/> Güvenli çıkış yap</button>
    </article>
  </section>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<PortalProfile | null>(null)
  const [todayLessons, setTodayLessons] = useState<PortalLesson[]>([])
  const [program, setProgram] = useState<PortalLesson[]>([])
  const [assignments, setAssignments] = useState<PortalAssignment[]>([])
  const [tab, setTab] = useState<Tab>('bugun')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadAll() {
    if (!session) return
    setRefreshing(true)
    try {
      const nextProfile = await loadPortalProfile()
      const [today, nextProgram, nextAssignments] = await Promise.all([
        loadTodayLessons(),
        loadProgram(30),
        loadAssignments(),
      ])
      setProfile(nextProfile)
      setTodayLessons(today)
      setProgram(nextProgram)
      setAssignments(nextAssignments)
      setError(null)
    } catch (e) {
      setProfile(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: auth } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setTodayLessons([])
        setProgram([])
        setAssignments([])
        setLoading(false)
      } else {
        setLoading(true)
      }
    })
    return () => { mounted = false; auth.subscription.unsubscribe() }
  }, [])

  useEffect(() => { if (session) void loadAll() }, [session?.user.id])

  async function login() {
    setLoginBusy(true)
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (signInError) throw signInError
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setLoginBusy(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setTab('bugun')
  }

  if (!session) return <LoginScreen busy={loginBusy} error={error} onLogin={login} />

  if (loading) return <main className="loading-page"><div className="brand-mark small"><span>BS</span><i /></div><LoaderCircle className="spin" size={26}/><strong>Portal hazırlanıyor…</strong></main>

  if (!profile) return <main className="access-page"><div className="brand-mark small"><span>BS</span><i /></div><ShieldCheck size={34}/><h1>Portal erişimi tanımlı değil</h1><p>{error || 'Bu Google hesabı öğrenci veya öğretmen portalına bağlanmamış.'}</p><button className="secondary-button" onClick={() => void logout()}><LogOut size={18}/> Çıkış yap</button></main>

  return <div className="app-shell">
    <header className="app-header">
      <div className="header-brand"><div className="brand-mark mini"><span>BS</span><i /></div><div><strong>BS Eğitim</strong><span>{roleCopy(profile.rol)}</span></div></div>
      <button className="icon-button" aria-label="Yenile" disabled={refreshing} onClick={() => void loadAll()}><RefreshCw className={refreshing ? 'spin' : ''} size={18}/></button>
    </header>

    <main className="content">
      {error && <div className="error-box compact">{error}</div>}
      {tab === 'bugun' && <TodayPage profile={profile} lessons={todayLessons} />}
      {tab === 'program' && <ProgramPage lessons={program} />}
      {tab === 'odevler' && <AssignmentsPage items={assignments} role={profile.rol} />}
      {tab === 'profil' && <ProfilePage profile={profile} email={session.user.email ?? null} onLogout={logout} />}
    </main>

    <nav className="bottom-nav" aria-label="Portal menüsü">
      <button className={tab === 'bugun' ? 'active' : ''} onClick={() => setTab('bugun')}><CalendarDays size={20}/><span>Bugün</span></button>
      <button className={tab === 'program' ? 'active' : ''} onClick={() => setTab('program')}><BookOpenCheck size={20}/><span>Program</span></button>
      <button className={tab === 'odevler' ? 'active' : ''} onClick={() => setTab('odevler')}><GraduationCap size={21}/><span>Ödevler</span></button>
      <button className={tab === 'profil' ? 'active' : ''} onClick={() => setTab('profil')}><UserRound size={20}/><span>Profil</span></button>
    </nav>
  </div>
}
