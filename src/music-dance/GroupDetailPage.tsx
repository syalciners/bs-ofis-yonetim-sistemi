import { ArrowLeft, CalendarDays, Check, Clock, GraduationCap, Layers3, MapPin, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { t } from '../lib/productProfile'
import { useMusicDanceData } from './MusicDanceDataProvider'
import { mdHaftaDersleriniGetir, mdKatilimDurumuGuncelle } from './service'
import type { MdHaftaVerisi, MdKatilimDurumu } from './types'

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const KATILIM: MdKatilimDurumu[] = ['Katıldı', 'Gelmedi', 'Mazeretli', 'Planlandı']
const localIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const mondayOf = () => { const date = new Date(); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); return localIso(date) }
const addDays = (value: string, amount: number) => { const [y,m,d] = value.split('-').map(Number); const date = new Date(y,m-1,d); date.setDate(date.getDate()+amount); return localIso(date) }
const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
const initials = (value: string) => value.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('tr-TR')

export function GroupDetailPage() {
  const { grupId = '' } = useParams()
  const navigate = useNavigate()
  const { data, aktifKurum } = useMusicDanceData()
  const [week, setWeek] = useState<MdHaftaVerisi>({ dersler: [], katilimlar: [] })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const weekStart = useMemo(() => mondayOf(), [])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])
  const group = data?.gruplar.find(x => x.grup_id === grupId) || null

  const loadWeek = useCallback(async () => {
    if (!aktifKurum) return
    setLoading(true)
    try {
      const all = await mdHaftaDersleriniGetir(aktifKurum.kurum_id, weekStart, weekEnd)
      const lessons = all.dersler.filter(x => x.grup_id === grupId)
      const lessonIds = new Set(lessons.map(x => x.ders_id))
      setWeek({ dersler: lessons, katilimlar: all.katilimlar.filter(x => lessonIds.has(x.ders_id)) })
      setError(null)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally { setLoading(false) }
  }, [aktifKurum?.kurum_id, grupId, weekStart, weekEnd])

  useEffect(() => { void loadWeek() }, [loadWeek])

  const memberships = useMemo(() => data?.grupUyeleri.filter(x => x.grup_id === grupId && x.durum !== 'Pasif') || [], [data, grupId])
  const members = memberships.map(link => ({ link, student: data?.kursiyerler.find(x => x.kursiyer_id === link.kursiyer_id) })).filter(x => x.student)
  const programs = data?.programlar.filter(x => x.grup_id === grupId && x.program_turu === 'Grup' && x.durum === 'Aktif') || []
  const branch = data?.branslar.find(x => x.brans_id === group?.brans_id)
  const teacher = data?.egitmenler.find(x => x.egitmen_id === group?.varsayilan_egitmen_id)
  const room = data?.mekanlar.find(x => x.mekan_id === group?.varsayilan_mekan_id)
  const capacity = Number(group?.kapasite || 0)
  const occupancy = capacity ? Math.min(100, Math.round(members.length / capacity * 100)) : 0

  if (!data || !aktifKurum) return null
  if (!group) return <div className="md-group-detail-page"><button className="md-detail-back" onClick={() => navigate('/gruplar')}><ArrowLeft/> Gruplar</button><section className="md-detail-empty"><Layers3/><strong>Grup bulunamadı.</strong></section></div>

  const setAttendance = async (attendanceId: string, status: MdKatilimDurumu) => {
    setBusyId(attendanceId)
    try { await mdKatilimDurumuGuncelle(attendanceId, status); await loadWeek() }
    catch (e: any) { setError(e?.message || String(e)) }
    finally { setBusyId(null) }
  }

  return <div className="md-group-detail-page md-page-stack">
    <button className="md-detail-back" onClick={() => navigate('/gruplar')}><ArrowLeft/> Gruplar</button>

    <section className="md-group-profile-hero">
      <div className="md-group-profile-main"><span><Layers3/></span><div><small>GRUP PROFİLİ</small><h1>{group.grup_adi}</h1><p>{branch?.brans_adi || t.branch}{group.seviye ? ` · ${group.seviye}` : ''}{group.yas_grubu ? ` · ${group.yas_grubu}` : ''}</p></div></div>
      <div className="md-group-profile-facts"><span><GraduationCap/><b>{teacher?.ad_soyad || 'Eğitmen atanmadı'}</b></span><span><MapPin/><b>{room?.mekan_adi || 'Stüdyo atanmadı'}</b></span></div>
    </section>

    {error && <div className="md-detail-error">{error}</div>}

    <section className="md-group-detail-kpis">
      <article><span className="blue"><Users/></span><div><small>Aktif Üye</small><strong>{members.length}</strong><em>{capacity ? `${capacity} kişilik kapasite` : 'kapasite tanımsız'}</em></div></article>
      <article><span className="violet"><Layers3/></span><div><small>Doluluk</small><strong>{capacity ? `%${occupancy}` : '—'}</strong><em>{capacity ? `${members.length}/${capacity}` : 'kapasite tanımlayın'}</em></div></article>
      <article><span className="gold"><CalendarDays/></span><div><small>Aktif Program</small><strong>{programs.length}</strong><em>haftalık program</em></div></article>
      <article><span className="rose"><Clock/></span><div><small>Bu Hafta</small><strong>{loading ? '—' : week.dersler.length}</strong><em>grup dersi</em></div></article>
    </section>

    <section className="md-detail-two-col">
      <article className="md-detail-panel">
        <header><div><span>PROGRAM</span><h2>Haftalık Akış</h2></div><small>{programs.length} aktif</small></header>
        <div className="md-detail-list">
          {programs.map(program => {
            const pTeacher = data.egitmenler.find(x => x.egitmen_id === program.egitmen_id)
            const pRoom = data.mekanlar.find(x => x.mekan_id === program.mekan_id)
            return <div className="md-detail-row" key={program.program_id}><span className="blue"><CalendarDays/></span><div><strong>{GUNLER[Math.max(0, program.haftanin_gunu - 1)]} · {program.baslangic_saati.slice(0,5)}</strong><small>{program.sure_dk} dk · {pTeacher?.ad_soyad || 'Eğitmen yok'}</small><em>{pRoom?.mekan_adi || 'Mekan yok'}</em></div><b>{program.kursiyer_birim_ucreti ? `${program.kursiyer_birim_ucreti.toLocaleString('tr-TR')} ₺` : '—'}</b></div>
          })}
          {!programs.length && <div className="md-detail-zero"><CalendarDays/><span>Bu grup için aktif program bulunmuyor.</span></div>}
        </div>
      </article>

      <article className="md-detail-panel">
        <header><div><span>ÜYELER</span><h2>Grup Kursiyerleri</h2></div><small>{members.length} kişi</small></header>
        <div className="md-group-member-list">
          {members.map(({ link, student }) => <button type="button" key={link.grup_uye_id} onClick={() => navigate(`/kursiyerler/${student!.kursiyer_id}`)}><span>{initials(student!.ad_soyad)}</span><div><strong>{student!.ad_soyad}</strong><small>{student!.seviye || 'Seviye belirtilmedi'}</small></div><b>{link.birim_ucret ? `${Number(link.birim_ucret).toLocaleString('tr-TR')} ₺` : '—'}</b></button>)}
          {!members.length && <div className="md-detail-zero"><Users/><span>Gruba henüz kursiyer eklenmedi.</span></div>}
        </div>
      </article>
    </section>

    <section className="md-detail-panel md-group-attendance-panel">
      <header><div><span>BU HAFTA · YOKLAMA</span><h2>Grup Dersleri ve Katılım</h2></div><small>{shortDate(weekStart)} – {shortDate(weekEnd)}</small></header>
      {loading ? <div className="md-group-attendance-loading"><Clock/><span>Haftalık dersler yükleniyor…</span></div> : <div className="md-group-week-lessons">
        {week.dersler.map(lesson => {
          const attendances = week.katilimlar.filter(x => x.ders_id === lesson.ders_id)
          return <article key={lesson.ders_id} className="md-group-week-lesson">
            <header><div><strong>{shortDate(lesson.tarih)} · {lesson.baslangic_saati.slice(0,5)}</strong><small>{branch?.brans_adi || t.branch} · {lesson.sure_dk} dk</small></div><em className={`md-status ${lesson.ders_durumu.toLocaleLowerCase('tr-TR').replaceAll(' ','-').replaceAll('ı','i')}`}>{lesson.ders_durumu}</em></header>
            <div className="md-group-attendance-list">
              {attendances.map(attendance => {
                const student = data.kursiyerler.find(x => x.kursiyer_id === attendance.kursiyer_id)
                return <div key={attendance.katilim_id}><span className="avatar">{initials(student?.ad_soyad || '?')}</span><strong>{student?.ad_soyad || t.student}</strong><div className="actions">{KATILIM.map(status => <button type="button" key={status} disabled={busyId === attendance.katilim_id} className={attendance.katilim_durumu === status ? `active ${status.toLocaleLowerCase('tr-TR').replace('ı','i')}` : ''} onClick={() => void setAttendance(attendance.katilim_id, status)}>{status === 'Katıldı' ? <Check/> : status === 'Gelmedi' ? <X/> : null}{status}</button>)}</div></div>
              })}
            </div>
          </article>
        })}
        {!week.dersler.length && <div className="md-detail-zero"><CalendarDays/><span>Bu hafta için grup dersi henüz oluşmadı. Program ekranından haftayı hazırlayın.</span></div>}
      </div>}
    </section>
  </div>
}
