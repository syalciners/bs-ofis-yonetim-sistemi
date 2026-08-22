import { ArrowLeft, Banknote, CalendarDays, Clock, GraduationCap, Layers3, Mail, MapPin, Phone, ReceiptText, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { t } from '../lib/productProfile'
import { useMusicDanceData } from './MusicDanceDataProvider'
import { mdEgitmenDetayGetir, type MdEgitmenDetayVerisi } from './teacherDetailService'

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0)
const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
const initials = (value: string) => value.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('tr-TR')

export function TeacherDetailPage() {
  const { egitmenId = '' } = useParams()
  const navigate = useNavigate()
  const { data, aktifKurum } = useMusicDanceData()
  const [detail, setDetail] = useState<MdEgitmenDetayVerisi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const teacher = data?.egitmenler.find(x => x.egitmen_id === egitmenId) || null
  const branchLinks = useMemo(() => data?.egitmenBranslari.filter(x => x.egitmen_id === egitmenId && x.aktif !== false) || [], [data, egitmenId])
  const branches = branchLinks.map(link => data?.branslar.find(x => x.brans_id === link.brans_id)).filter(Boolean)
  const programs = useMemo(() => data?.programlar.filter(x => x.egitmen_id === egitmenId && x.durum === 'Aktif') || [], [data, egitmenId])

  useEffect(() => {
    let alive = true
    if (!aktifKurum || !egitmenId) return
    setLoading(true)
    mdEgitmenDetayGetir(aktifKurum.kurum_id, egitmenId)
      .then(result => { if (alive) { setDetail(result); setError(null) } })
      .catch((e: any) => { if (alive) setError(e?.message || String(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [aktifKurum?.kurum_id, egitmenId])

  if (!data || !aktifKurum) return null
  if (!teacher) return <div className="md-teacher-detail-page"><button className="md-detail-back" onClick={() => navigate('/egitmenler')}><ArrowLeft/> {t.teachers}</button><section className="md-detail-empty"><GraduationCap/><strong>{t.teacher} bulunamadı.</strong></section></div>

  const balance = detail?.bakiye?.bakiye || 0
  const individualPrograms = programs.filter(x => x.program_turu === 'Bireysel')
  const groupPrograms = programs.filter(x => x.program_turu === 'Grup')

  return <div className="md-teacher-detail-page md-page-stack">
    <button className="md-detail-back" onClick={() => navigate('/egitmenler')}><ArrowLeft/> {t.teachers}</button>

    <section className="md-teacher-profile-hero">
      <div className="md-teacher-profile-main"><span>{initials(teacher.ad_soyad)}</span><div><small>EĞİTMEN PROFİLİ</small><h1>{teacher.ad_soyad}</h1><p>{branches.map(x => x?.brans_adi).filter(Boolean).join(' · ') || `${t.branch} tanımlanmamış`} · {teacher.durum}</p></div></div>
      <div className="md-teacher-contact-list">
        {teacher.telefon && <a href={`tel:${teacher.telefon}`}><Phone/> {teacher.telefon}</a>}
        {teacher.email && <a href={`mailto:${teacher.email}`}><Mail/> {teacher.email}</a>}
      </div>
    </section>

    {error && <div className="md-detail-error">{error}</div>}

    <section className="md-teacher-detail-kpis">
      <article><span className="blue"><CalendarDays/></span><div><small>Aktif Program</small><strong>{programs.length}</strong><em>{individualPrograms.length} bireysel · {groupPrograms.length} grup</em></div></article>
      <article><span className="violet"><Layers3/></span><div><small>Branş</small><strong>{branches.length}</strong><em>aktif uzmanlık alanı</em></div></article>
      <article><span className="gold"><WalletCards/></span><div><small>Toplam Hakediş</small><strong>{loading ? '—' : money(detail?.bakiye?.toplam_hakedis || 0)}</strong><em>gerçekleşen dersler</em></div></article>
      <article><span className="rose"><Banknote/></span><div><small>Kalan Ödeme</small><strong className={balance > 0 ? 'debt' : ''}>{loading ? '—' : money(Math.max(0, balance))}</strong><em>{balance > 0 ? 'ödenecek hakediş' : 'hesap dengede'}</em></div></article>
    </section>

    <section className="md-detail-two-col">
      <article className="md-detail-panel">
        <header><div><span>PROGRAM</span><h2>Haftalık Ders Akışı</h2></div><small>{programs.length} aktif</small></header>
        <div className="md-detail-list">
          {programs.map(program => {
            const branch = data.branslar.find(x => x.brans_id === program.brans_id)
            const room = data.mekanlar.find(x => x.mekan_id === program.mekan_id)
            const group = data.gruplar.find(x => x.grup_id === program.grup_id)
            const student = data.kursiyerler.find(x => x.kursiyer_id === program.kursiyer_id)
            const source = program.program_turu === 'Grup' ? group?.grup_adi || 'Grup' : student?.ad_soyad || t.student
            return <div className="md-detail-row" key={program.program_id}><span className={program.program_turu === 'Grup' ? 'violet' : 'blue'}>{program.program_turu === 'Grup' ? <Layers3/> : <GraduationCap/>}</span><div><strong>{source}</strong><small>{branch?.brans_adi || t.branch} · {GUNLER[Math.max(0, program.haftanin_gunu - 1)]} {program.baslangic_saati.slice(0,5)}</small><em>{room?.mekan_adi || 'Mekan yok'} · {program.sure_dk} dk</em></div><b>{money(program.egitmen_birim_hakedisi)}</b></div>
          })}
          {!programs.length && <div className="md-detail-zero"><CalendarDays/><span>Aktif program bulunmuyor.</span></div>}
        </div>
      </article>

      <article className="md-detail-panel md-teacher-finance">
        <header><div><span>FİNANS</span><h2>Hakediş & Ödemeler</h2></div><button onClick={() => navigate('/finans')}>Finansa Git</button></header>
        <div className="md-finance-summary-grid">
          <span><small>Toplam Hakediş</small><b>{money(detail?.bakiye?.toplam_hakedis || 0)}</b></span>
          <span><small>Toplam Ödeme</small><b>{money(detail?.bakiye?.toplam_odeme || 0)}</b></span>
          <span className="accent"><small>Kalan</small><b>{money(balance)}</b></span>
        </div>
        <div className="md-detail-payment-list">
          {(detail?.odemeler || []).slice(0, 6).map(payment => <div key={payment.odeme_id}><span><ReceiptText/><div><strong>{shortDate(payment.tarih)}</strong><small>{payment.odeme_yontemi}{payment.aciklama ? ` · ${payment.aciklama}` : ''}</small></div></span><b>{money(payment.tutar)}</b></div>)}
          {!detail?.odemeler.length && <div className="md-detail-zero compact"><Banknote/><span>Henüz ödeme kaydı yok.</span></div>}
        </div>
      </article>
    </section>

    <section className="md-detail-panel">
      <header><div><span>DERS GEÇMİŞİ</span><h2>Son Dersler</h2></div><small>{detail?.sonDersler.length || 0} kayıt</small></header>
      <div className="md-teacher-lesson-grid">
        {(detail?.sonDersler || []).slice(0, 12).map(lesson => {
          const branch = data.branslar.find(x => x.brans_id === lesson.brans_id)
          const room = data.mekanlar.find(x => x.mekan_id === lesson.mekan_id)
          const group = data.gruplar.find(x => x.grup_id === lesson.grup_id)
          return <article key={lesson.ders_id}><span className={lesson.ders_turu === 'Grup' ? 'violet' : 'blue'}>{lesson.ders_turu === 'Grup' ? <Layers3/> : <Clock/>}</span><div><strong>{branch?.brans_adi || t.branch}</strong><small>{shortDate(lesson.tarih)} · {lesson.baslangic_saati.slice(0,5)} · {lesson.sure_dk} dk</small><em>{lesson.ders_turu === 'Grup' ? group?.grup_adi || 'Grup' : 'Bireysel'}{room ? ` · ${room.mekan_adi}` : ''}</em></div><b className={`md-status ${lesson.ders_durumu.toLocaleLowerCase('tr-TR').replaceAll(' ','-').replaceAll('ı','i')}`}>{lesson.ders_durumu}</b></article>
        })}
        {!detail?.sonDersler.length && <div className="md-detail-zero"><MapPin/><span>Henüz ders geçmişi oluşmadı.</span></div>}
      </div>
    </section>
  </div>
}
