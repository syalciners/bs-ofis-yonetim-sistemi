import { ArrowLeft, Banknote, CalendarDays, GraduationCap, Layers3, Mail, MapPin, Phone, ReceiptText, Users, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { t } from '../lib/productProfile'
import { useMusicDanceData } from './MusicDanceDataProvider'
import { mdKursiyerDetayGetir, type MdKursiyerDetayVerisi } from './studentDetailService'

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0)
const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
const initials = (value: string) => value.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('tr-TR')

export function StudentDetailPage() {
  const { kursiyerId = '' } = useParams()
  const navigate = useNavigate()
  const { data, aktifKurum } = useMusicDanceData()
  const [detail, setDetail] = useState<MdKursiyerDetayVerisi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const student = data?.kursiyerler.find(x => x.kursiyer_id === kursiyerId) || null

  useEffect(() => {
    let alive = true
    if (!aktifKurum || !kursiyerId) return
    setLoading(true)
    mdKursiyerDetayGetir(aktifKurum.kurum_id, kursiyerId)
      .then(result => { if (alive) { setDetail(result); setError(null) } })
      .catch((e: any) => { if (alive) setError(e?.message || String(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [aktifKurum?.kurum_id, kursiyerId])

  const memberships = useMemo(() => {
    if (!data) return []
    return data.grupUyeleri
      .filter(x => x.kursiyer_id === kursiyerId && x.durum !== 'Pasif')
      .map(link => ({ link, group: data.gruplar.find(g => g.grup_id === link.grup_id) }))
      .filter(x => x.group)
  }, [data, kursiyerId])

  const individualPrograms = useMemo(() => data?.programlar.filter(x => x.kursiyer_id === kursiyerId && x.program_turu === 'Bireysel' && x.durum === 'Aktif') || [], [data, kursiyerId])
  const completedAttendances = detail?.dersGecmisi.filter(x => ['Katıldı', 'Gelmedi', 'Mazeretli'].includes(x.katilim.katilim_durumu)) || []
  const attended = completedAttendances.filter(x => x.katilim.katilim_durumu === 'Katıldı').length
  const attendanceRate = completedAttendances.length ? Math.round(attended / completedAttendances.length * 100) : 0
  const balance = detail?.bakiye?.bakiye || 0

  if (!data || !aktifKurum) return null
  if (!student) return <div className="md-student-detail-page"><button className="md-detail-back" onClick={() => navigate('/kursiyerler')}><ArrowLeft/> {t.students}</button><section className="md-detail-empty"><Users/><strong>{t.student} bulunamadı.</strong></section></div>

  return <div className="md-student-detail-page md-page-stack">
    <button className="md-detail-back" onClick={() => navigate('/kursiyerler')}><ArrowLeft/> {t.students}</button>

    <section className="md-student-profile-hero">
      <div className="md-student-profile-main">
        <span className="md-student-profile-avatar">{initials(student.ad_soyad)}</span>
        <div>
          <small>KURSİYER PROFİLİ</small>
          <h1>{student.ad_soyad}</h1>
          <p>{student.seviye || 'Seviye belirtilmedi'} · {student.durum}</p>
        </div>
      </div>
      <div className="md-student-contact-list">
        {student.telefon && <a href={`tel:${student.telefon}`}><Phone/> {student.telefon}</a>}
        {student.email && <a href={`mailto:${student.email}`}><Mail/> {student.email}</a>}
        {student.dogum_tarihi && <span><CalendarDays/> {shortDate(student.dogum_tarihi)}</span>}
      </div>
    </section>

    {error && <div className="md-detail-error">{error}</div>}

    <section className="md-detail-kpis">
      <article><span className="blue"><WalletCards/></span><div><small>Güncel Bakiye</small><strong className={balance > 0 ? 'debt' : balance < 0 ? 'credit' : ''}>{loading ? '—' : money(Math.abs(balance))}</strong><em>{balance > 0 ? 'ödenecek' : balance < 0 ? 'kursiyer alacağı' : 'hesap dengede'}</em></div></article>
      <article><span className="violet"><GraduationCap/></span><div><small>Aktif Program</small><strong>{individualPrograms.length}</strong><em>bireysel program</em></div></article>
      <article><span className="rose"><Layers3/></span><div><small>Aktif Grup</small><strong>{memberships.length}</strong><em>grup üyeliği</em></div></article>
      <article><span className="gold"><Users/></span><div><small>Devam Oranı</small><strong>{completedAttendances.length ? `%${attendanceRate}` : '—'}</strong><em>{completedAttendances.length ? `${attended}/${completedAttendances.length} katılım` : 'henüz veri yok'}</em></div></article>
    </section>

    <section className="md-detail-two-col">
      <article className="md-detail-panel">
        <header><div><span>PROGRAM</span><h2>Bireysel Dersler</h2></div><small>{individualPrograms.length} aktif</small></header>
        <div className="md-detail-list">
          {individualPrograms.map(program => {
            const branch = data.branslar.find(x => x.brans_id === program.brans_id)
            const teacher = data.egitmenler.find(x => x.egitmen_id === program.egitmen_id)
            const room = data.mekanlar.find(x => x.mekan_id === program.mekan_id)
            return <div className="md-detail-row" key={program.program_id}><span className="blue"><CalendarDays/></span><div><strong>{branch?.brans_adi || t.branch}</strong><small>{GUNLER[Math.max(0, program.haftanin_gunu - 1)]} · {program.baslangic_saati.slice(0,5)} · {program.sure_dk} dk</small><em>{teacher?.ad_soyad || 'Eğitmen yok'}{room ? ` · ${room.mekan_adi}` : ''}</em></div><b>{money(program.kursiyer_birim_ucreti)}</b></div>
          })}
          {!individualPrograms.length && <div className="md-detail-zero"><CalendarDays/><span>Aktif bireysel program bulunmuyor.</span></div>}
        </div>
      </article>

      <article className="md-detail-panel">
        <header><div><span>TOPLULUK</span><h2>Grup Üyelikleri</h2></div><small>{memberships.length} aktif</small></header>
        <div className="md-detail-list">
          {memberships.map(({ link, group }) => {
            const branch = data.branslar.find(x => x.brans_id === group?.brans_id)
            const teacher = data.egitmenler.find(x => x.egitmen_id === group?.varsayilan_egitmen_id)
            const room = data.mekanlar.find(x => x.mekan_id === group?.varsayilan_mekan_id)
            return <div className="md-detail-row" key={link.grup_uye_id}><span className="violet"><Layers3/></span><div><strong>{group?.grup_adi}</strong><small>{branch?.brans_adi || t.branch}</small><em>{teacher?.ad_soyad || 'Eğitmen yok'}{room ? ` · ${room.mekan_adi}` : ''}</em></div><b>{link.birim_ucret ? money(link.birim_ucret) : '—'}</b></div>
          })}
          {!memberships.length && <div className="md-detail-zero"><Layers3/><span>Aktif grup üyeliği bulunmuyor.</span></div>}
        </div>
      </article>
    </section>

    <section className="md-detail-two-col">
      <article className="md-detail-panel md-detail-finance">
        <header><div><span>FİNANS</span><h2>Hesap Özeti</h2></div><button onClick={() => navigate('/finans')}>Finansa Git</button></header>
        <div className="md-finance-summary-grid">
          <span><small>Toplam Ders Ücreti</small><b>{money(detail?.bakiye?.toplam_borc || 0)}</b></span>
          <span><small>Toplam Tahsilat</small><b>{money(detail?.bakiye?.toplam_tahsilat || 0)}</b></span>
          <span className="accent"><small>Güncel Bakiye</small><b>{money(balance)}</b></span>
        </div>
        <div className="md-detail-payment-list">
          {(detail?.tahsilatlar || []).slice(0, 5).map(payment => <div key={payment.tahsilat_id}><span><ReceiptText/><div><strong>{shortDate(payment.tarih)}</strong><small>{payment.odeme_yontemi}{payment.aciklama ? ` · ${payment.aciklama}` : ''}</small></div></span><b>{money(payment.tutar)}</b></div>)}
          {!detail?.tahsilatlar.length && <div className="md-detail-zero compact"><Banknote/><span>Henüz tahsilat kaydı yok.</span></div>}
        </div>
      </article>

      <article className="md-detail-panel">
        <header><div><span>DEVAM</span><h2>Son Dersler</h2></div><small>{detail?.dersGecmisi.length || 0} kayıt</small></header>
        <div className="md-detail-list">
          {(detail?.dersGecmisi || []).slice(0, 8).map(({ ders, katilim }) => {
            const branch = data.branslar.find(x => x.brans_id === ders.brans_id)
            const room = data.mekanlar.find(x => x.mekan_id === ders.mekan_id)
            return <div className="md-detail-row lesson" key={katilim.katilim_id}><span className={katilim.katilim_durumu === 'Katıldı' ? 'green' : katilim.katilim_durumu === 'Gelmedi' ? 'rose' : 'gold'}><MapPin/></span><div><strong>{branch?.brans_adi || t.branch}</strong><small>{shortDate(ders.tarih)} · {ders.baslangic_saati.slice(0,5)}{room ? ` · ${room.mekan_adi}` : ''}</small><em>{ders.ders_turu}</em></div><b className={`attendance ${katilim.katilim_durumu.toLocaleLowerCase('tr-TR').replace('ı','i')}`}>{katilim.katilim_durumu}</b></div>
          })}
          {!detail?.dersGecmisi.length && <div className="md-detail-zero"><CalendarDays/><span>Henüz ders geçmişi oluşmadı.</span></div>}
        </div>
      </article>
    </section>
  </div>
}
