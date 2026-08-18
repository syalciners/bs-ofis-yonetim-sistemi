import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Clock3,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  UsersRound,
  Video,
} from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { ManagerModeNav } from '../components/ManagerModeNav'
import { addDays, todayISO } from '../lib/format'
import { isManagerTeacher } from '../lib/teacherTone'
import type { AppData } from '../lib/types'

export type PortalPreviewRole = 'Öğretmen' | 'Öğrenci'
type PortalTab = 'bugun' | 'program' | 'odevler' | 'profil'

interface PreviewLesson {
  ders_id: string
  tarih: string
  baslangic_saati: string | null
  bitis_saati: string | null
  ders_durumu: string | null
  brans_adi: string | null
  derslik_adi: string | null
  ogrenci_adi: string | null
  ogretmen_adi: string | null
  zoom_katilim_baglantisi: string | null
}

interface PreviewAssignment {
  odev_id: string
  odev_basligi: string | null
  odev_aciklamasi: string | null
  verilis_tarihi: string
  son_teslim_tarihi: string | null
  durum: string
  oncelik: string | null
  ogrenci_adi: string | null
  ogretmen_adi: string | null
  odev_dosya_linki: string | null
  odev_fotograf_linki: string | null
  ogretmen_notu: string | null
  puan: string | null
}

const sourceRowExists = (row: unknown) => (row as { kaynakta_var?: boolean }).kaynakta_var !== false
const roleSlug = (role: PortalPreviewRole) => role === 'Öğretmen' ? 'ogretmen' : 'ogrenci'
const roleCopy = (role: PortalPreviewRole) => role === 'Öğretmen' ? 'Öğretmen Portalı' : 'Öğrenci Portalı'

function formatDate(value: string, long = false) {
  const date = new Date(`${value}T12:00:00+03:00`)
  return new Intl.DateTimeFormat('tr-TR', long
    ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' }
    : { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Europe/Istanbul' }).format(date)
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : '—'
}

function todayLong() {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' }).format(new Date())
}

function buildLessons(data: AppData, role: PortalPreviewRole, personId: string): PreviewLesson[] {
  return data.dersler
    .filter(x => sourceRowExists(x) && Boolean(x.tarih) && (role === 'Öğretmen' ? x.ogretmen_id === personId : x.ogrenci_id === personId))
    .map(x => ({
      ders_id: x.ders_id,
      tarih: String(x.tarih),
      baslangic_saati: x.baslangic_saati || null,
      bitis_saati: x.bitis_saati || null,
      ders_durumu: x.ders_durumu || null,
      brans_adi: data.branslar.find(b => b.brans_id === x.brans_id)?.brans_adi || null,
      derslik_adi: data.derslikler.find(d => d.derslik_id === x.derslik_id)?.mekan_adi || null,
      ogrenci_adi: data.ogrenciler.find(o => o.ogrenci_id === x.ogrenci_id)?.ad_soyad || null,
      ogretmen_adi: data.ogretmenler.find(o => o.ogretmen_id === x.ogretmen_id)?.ad_soyad || null,
      zoom_katilim_baglantisi: x.zoom_katilim_baglantisi || null,
    }))
    .sort((a, b) => `${a.tarih} ${a.baslangic_saati || ''} ${a.ders_id}`.localeCompare(`${b.tarih} ${b.baslangic_saati || ''} ${b.ders_id}`, 'tr-TR'))
}

function buildAssignments(data: AppData, role: PortalPreviewRole, personId: string): PreviewAssignment[] {
  return data.odevler
    .filter(x => sourceRowExists(x) && (role === 'Öğretmen' ? x.ogretmen_id === personId : x.ogrenci_id === personId))
    .map(x => ({
      odev_id: x.odev_id,
      odev_basligi: x.odev_basligi || null,
      odev_aciklamasi: x.odev_aciklamasi || null,
      verilis_tarihi: x.verilis_tarihi,
      son_teslim_tarihi: x.son_teslim_tarihi || null,
      durum: x.durum,
      oncelik: x.oncelik || null,
      ogrenci_adi: data.ogrenciler.find(o => o.ogrenci_id === x.ogrenci_id)?.ad_soyad || null,
      ogretmen_adi: data.ogretmenler.find(o => o.ogretmen_id === x.ogretmen_id)?.ad_soyad || null,
      odev_dosya_linki: x.odev_dosya_linki || null,
      odev_fotograf_linki: x.odev_fotograf_linki || null,
      ogretmen_notu: x.ogretmen_notu || null,
      puan: x.puan || null,
    }))
    .sort((a, b) => b.verilis_tarihi.localeCompare(a.verilis_tarihi) || a.odev_id.localeCompare(b.odev_id))
}

function ReadOnlyPill() {
  return <span className="portal-preview-readonly-pill"><LockKeyhole size={13}/> Salt okunur</span>
}

function LessonList({ items, emptyText }: { items: PreviewLesson[]; emptyText: string }) {
  if (!items.length) return <div className="portal-preview-empty"><CalendarDays size={27}/><strong>{emptyText}</strong><span>Yeni kayıt oluştuğunda burada görünecek.</span></div>
  return <div className="portal-preview-lesson-list">{items.map(lesson => <article className="portal-preview-lesson-card" key={lesson.ders_id}>
    <div className="portal-preview-lesson-time"><strong>{formatTime(lesson.baslangic_saati)}</strong><span>{formatTime(lesson.bitis_saati)}</span></div>
    <div className="portal-preview-lesson-main">
      <div className="portal-preview-lesson-heading"><strong>{lesson.brans_adi || 'Ders'}</strong><span>{lesson.ders_durumu || 'Planlandı'}</span></div>
      <div className="portal-preview-lesson-meta">
        <span>{lesson.ogrenci_adi && lesson.ogretmen_adi ? `${lesson.ogrenci_adi} · ${lesson.ogretmen_adi}` : lesson.ogrenci_adi || lesson.ogretmen_adi || '—'}</span>
        <span>{lesson.derslik_adi || 'Ders yeri belirtilmedi'}</span>
      </div>
    </div>
    {lesson.zoom_katilim_baglantisi && <a className="portal-preview-zoom" href={lesson.zoom_katilim_baglantisi} target="_blank" rel="noreferrer" aria-label="Zoom dersine katıl"><Video size={17}/></a>}
  </article>)}</div>
}

function TodayView({ role, name, lessons }: { role: PortalPreviewRole; name: string; lessons: PreviewLesson[] }) {
  return <>
    <section className="portal-preview-hero">
      <div><span>{roleCopy(role)}</span><h2>Merhaba, {name.split(' ')[0]}</h2><p>{todayLong()}</p></div>
      <div className="portal-preview-hero-icon">{role === 'Öğretmen' ? <GraduationCap size={30}/> : <BookOpenCheck size={29}/>}</div>
    </section>
    <section className="portal-preview-section">
      <div className="portal-preview-section-title"><div><span>Günün akışı</span><h3>Bugünkü dersler</h3></div><ReadOnlyPill/></div>
      <LessonList items={lessons} emptyText="Bugün planlanmış ders yok"/>
    </section>
  </>
}

function ProgramView({ lessons }: { lessons: PreviewLesson[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, PreviewLesson[]>()
    for (const lesson of lessons) map.set(lesson.tarih, [...(map.get(lesson.tarih) || []), lesson])
    return [...map.entries()]
  }, [lessons])
  return <section className="portal-preview-section portal-preview-page-section">
    <div className="portal-preview-page-heading"><div><span>Önümüzdeki 30 gün</span><h2>Programım</h2></div><ReadOnlyPill/></div>
    {!grouped.length ? <LessonList items={[]} emptyText="Yaklaşan ders bulunmuyor"/> : grouped.map(([date, dayLessons]) => <div className="portal-preview-day-group" key={date}>
      <div className="portal-preview-day-label"><CalendarDays size={16}/><strong>{formatDate(date, true)}</strong></div>
      <LessonList items={dayLessons} emptyText=""/>
    </div>)}
  </section>
}

function AssignmentsView({ items, role }: { items: PreviewAssignment[]; role: PortalPreviewRole }) {
  return <section className="portal-preview-section portal-preview-page-section">
    <div className="portal-preview-page-heading"><div><span>{role === 'Öğretmen' ? 'Verilen ödevler' : 'Çalışma planı'}</span><h2>Ödevler</h2></div><ReadOnlyPill/></div>
    {!items.length ? <div className="portal-preview-empty"><BookOpenCheck size={27}/><strong>Aktif ödev bulunmuyor</strong><span>Ödev kayıtları burada görüntülenecek.</span></div> : <div className="portal-preview-assignment-list">{items.map(item => <article className="portal-preview-assignment-card" key={item.odev_id}>
      <div className="portal-preview-assignment-top"><span>{item.durum}</span>{item.oncelik && <small>{item.oncelik}</small>}</div>
      <h3>{item.odev_basligi || 'Ödev'}</h3>
      <p>{item.odev_aciklamasi || 'Açıklama eklenmemiş.'}</p>
      <div className="portal-preview-assignment-person">{role === 'Öğretmen' ? item.ogrenci_adi : item.ogretmen_adi}</div>
      <div className="portal-preview-assignment-footer">
        <span><Clock3 size={15}/>{item.son_teslim_tarihi ? `Son teslim ${formatDate(item.son_teslim_tarihi)}` : `Verildi ${formatDate(item.verilis_tarihi)}`}</span>
        {(item.odev_dosya_linki || item.odev_fotograf_linki) && <a href={item.odev_dosya_linki || item.odev_fotograf_linki || '#'} target="_blank" rel="noreferrer">Dosyayı aç <ChevronRight size={15}/></a>}
      </div>
      {(item.puan || item.ogretmen_notu) && <div className="portal-preview-feedback">{item.puan && <strong>Puan: {item.puan}</strong>}{item.ogretmen_notu && <span>{item.ogretmen_notu}</span>}</div>}
    </article>)}</div>}
  </section>
}

function ProfileView({ role, name, email, onExit }: { role: PortalPreviewRole; name: string; email: string | null; onExit: () => void }) {
  return <section className="portal-preview-section portal-preview-page-section">
    <div className="portal-preview-page-heading"><div><span>Hesap ve erişim</span><h2>Profilim</h2></div><ReadOnlyPill/></div>
    <article className="portal-preview-profile-card">
      <div className="portal-preview-profile-avatar"><CircleUserRound size={34}/></div>
      <div className="portal-preview-profile-name"><strong>{name}</strong><span>{roleCopy(role)}</span></div>
      <div className="portal-preview-profile-rows">
        <div><span>Rol</span><strong>{role}</strong></div>
        <div><span>E-posta</span><strong>{email || '—'}</strong></div>
        <div><span>Erişim</span><strong className="portal-preview-safe">Yalnız görüntüleme</strong></div>
      </div>
      <div className="portal-preview-permission"><ShieldCheck size={18}/><div><strong>Portal salt okunur</strong><span>Bu görünüm ders, ödev, öğrenci veya öğretmen kayıtlarını değiştiremez.</span></div></div>
      <button className="portal-preview-exit" type="button" onClick={onExit}><ArrowLeft size={17}/> Kişi seçimine dön</button>
    </article>
  </section>
}

export function PortalPreviewPage({ role }: { role: PortalPreviewRole }) {
  const { data, profile: appProfile } = useAppData()
  const nav = useNavigate()
  const { personId } = useParams<{ personId?: string }>()
  const [tab, setTab] = useState<PortalTab>('bugun')
  const slug = roleSlug(role)
  const selectorPath = `/portal-onizleme/${slug}`

  useEffect(() => setTab('bugun'), [personId, role])

  const people = useMemo(() => {
    if (!data) return []
    if (role === 'Öğretmen') return data.ogretmenler
      .filter(x => x.durum !== 'Pasif' && x.rol !== 'Yönetici' && !isManagerTeacher(x.ad_soyad))
      .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr-TR'))
      .map(x => ({ id: x.ogretmen_id, ad_soyad: x.ad_soyad, email: x.email || null }))
    return data.ogrenciler
      .filter(x => x.durum !== 'Pasif')
      .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr-TR'))
      .map(x => ({ id: x.ogrenci_id, ad_soyad: x.ad_soyad, email: x.email || null }))
  }, [data, role])

  const person = useMemo(() => people.find(x => x.id === personId) || null, [people, personId])
  const lessons = useMemo(() => data && personId ? buildLessons(data, role, personId) : [], [data, role, personId])
  const assignments = useMemo(() => data && personId ? buildAssignments(data, role, personId) : [], [data, role, personId])
  const today = todayISO()
  const programEnd = addDays(today, 30)
  const todayLessons = lessons.filter(x => x.tarih === today)
  const programLessons = lessons.filter(x => x.tarih >= today && x.tarih <= programEnd)

  if (appProfile?.rol !== 'Yönetici') return <Navigate to="/" replace/>
  if (!data) return null

  if (!personId) return <div className="page-stack portal-selector-page">
    <section className="page-title-row"><div><span className="eyebrow">YÖNETİCİ ÖNİZLEMESİ</span><h1>{roleCopy(role)}</h1></div></section>
    <ManagerModeNav active={role === 'Öğretmen' ? 'ogretmen' : 'ogrenci'}/>
    <section className="portal-selector-panel">
      <div className="portal-selector-heading"><div><span>{role === 'Öğretmen' ? 'EĞİTİM KADROSU' : 'AKTİF ÖĞRENCİLER'}</span><h2>{role === 'Öğretmen' ? 'Öğretmen seç' : 'Öğrenci seç'}</h2></div><strong>{people.length} kişi</strong></div>
      <div className="portal-person-grid">{people.map(item => <button className="portal-person-card" type="button" key={item.id} onClick={() => nav(`${selectorPath}/${encodeURIComponent(item.id)}`)}>
        <span className="portal-person-avatar">{item.ad_soyad.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('tr-TR')}</span>
        <span className="portal-person-copy"><strong>{item.ad_soyad}</strong><small>{item.email || 'E-posta tanımlı değil'}</small></span>
        <ChevronRight size={18}/>
      </button>)}</div>
      {!people.length && <div className="calm-empty"><UsersRound/><b>Önizlenecek kişi bulunamadı.</b></div>}
    </section>
  </div>

  if (!person) return <div className="page-stack"><section className="calm-empty"><ShieldCheck/><b>Kişi bulunamadı veya portal önizlemesine uygun değil.</b><button className="secondary-btn" type="button" onClick={() => nav(selectorPath)}>Listeye dön</button></section></div>

  return <div className="portal-admin-preview-page">
    <section className="portal-preview-manager-bar">
      <button type="button" onClick={() => nav(selectorPath)}><ArrowLeft size={16}/><span>Kişi seç</span></button>
      <div><span>YÖNETİCİ ÖNİZLEMESİ</span><strong>{person.ad_soyad}</strong></div>
      <button type="button" onClick={() => nav('/menu')}>Yönetim</button>
    </section>

    <section className="portal-preview-shell" aria-label={`${person.ad_soyad} ${roleCopy(role)} önizlemesi`}>
      <header className="portal-preview-header">
        <div className="portal-preview-brand"><img src="./bs-egitim-icon-192-v2.png" alt="BS Eğitim"/><div><strong>BS Eğitim</strong><span>{roleCopy(role)}</span></div></div>
        <span className="portal-preview-admin-chip">Yönetici önizlemesi</span>
      </header>

      <main className="portal-preview-content">
        {tab === 'bugun' && <TodayView role={role} name={person.ad_soyad} lessons={todayLessons}/>} 
        {tab === 'program' && <ProgramView lessons={programLessons}/>} 
        {tab === 'odevler' && <AssignmentsView items={assignments} role={role}/>} 
        {tab === 'profil' && <ProfileView role={role} name={person.ad_soyad} email={person.email} onExit={() => nav(selectorPath)}/>} 
      </main>

      <nav className="portal-preview-bottom-nav" aria-label="Portal menüsü">
        <button className={tab === 'bugun' ? 'active' : ''} type="button" onClick={() => setTab('bugun')}><CalendarDays size={20}/><span>Bugün</span></button>
        <button className={tab === 'program' ? 'active' : ''} type="button" onClick={() => setTab('program')}><BookOpenCheck size={20}/><span>Program</span></button>
        <button className={tab === 'odevler' ? 'active' : ''} type="button" onClick={() => setTab('odevler')}><GraduationCap size={21}/><span>Ödevler</span></button>
        <button className={tab === 'profil' ? 'active' : ''} type="button" onClick={() => setTab('profil')}><UserRound size={20}/><span>Profil</span></button>
      </nav>
    </section>
  </div>
}
