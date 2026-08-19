import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import {
  examTotalNet,
  isCancelled,
  isDone,
  isoToday,
  shortDate,
  studentName,
  studentProfile,
  type Assignment,
  type CoachData,
} from './data'

function localIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function currentWeekBounds() {
  const now = new Date()
  const mondayOffset = (now.getDay() + 6) % 7
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - mondayOffset)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start: localIso(start), end: localIso(end) }
}

function assignmentPosition(item?: Assignment | null) {
  if (!item) return null
  if (item.calisma_turu === 'Sayfa') {
    if (item.baslangic_no != null && item.bitis_no != null) return `Sayfa ${item.baslangic_no}–${item.bitis_no}`
    if (item.baslangic_no != null) return `Sayfa ${item.baslangic_no}`
  }
  if (item.calisma_turu === 'Test') {
    if (item.baslangic_no != null && item.bitis_no != null) return `Test ${item.baslangic_no}–${item.bitis_no}`
    if (item.baslangic_no != null) return `Test ${item.baslangic_no}`
  }
  if (item.calisma_detayi) return item.calisma_detayi
  if (item.konu) return item.konu
  return null
}

function StudentStatus({ overdue, today }: { overdue: number; today: number }) {
  if (overdue > 0) return <span className="student360-status attention"><AlertTriangle/> {overdue} geciken</span>
  if (today > 0) return <span className="student360-status today"><Clock3/> Bugün {today}</span>
  return <span className="student360-status clear"><CheckCircle2/> Normal akış</span>
}

export function StudentDirectory({ data }: { data: CoachData }) {
  const [query, setQuery] = useState('')
  const today = isoToday()

  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr-TR')
    return data.coachingProfiles
      .map(profile => {
        const name = studentName(data, profile.ogrenci_id)
        const assignments = data.assignments.filter(x => x.ogrenci_id === profile.ogrenci_id && !isCancelled(x.durum))
        const open = assignments.filter(x => !isDone(x.durum))
        const overdue = open.filter(x => Boolean(x.son_teslim_tarihi && x.son_teslim_tarihi < today))
        const dueToday = open.filter(x => x.son_teslim_tarihi === today)
        const exams = data.exams.filter(x => x.ogrenci_id === profile.ogrenci_id).sort((a, b) => b.deneme_tarihi.localeCompare(a.deneme_tarihi))
        const latestExam = exams[0]
        const latestNet = latestExam ? examTotalNet(data, latestExam.deneme_id) : null
        const nextMeeting = data.meetings
          .filter(x => x.ogrenci_id === profile.ogrenci_id && x.gorusme_tarihi >= today && x.durum !== 'İptal')
          .sort((a, b) => a.gorusme_tarihi.localeCompare(b.gorusme_tarihi))[0]
        return { profile, name, open, overdue, dueToday, latestExam, latestNet, nextMeeting }
      })
      .filter(row => !normalized || [row.name, row.profile.sinav_turu, row.profile.hedef_okul, row.profile.hedef_bolum]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(normalized))
      .sort((a, b) => {
        if (a.overdue.length !== b.overdue.length) return b.overdue.length - a.overdue.length
        return a.name.localeCompare(b.name, 'tr-TR')
      })
  }, [data, query, today])

  return <div className="student360-directory page-stack">
    <header className="student360-directory-head">
      <div>
        <span className="student360-eyebrow">ÖĞRENCİ 360</span>
        <h1>Bir öğrenci, tek ekran.</h1>
        <p>Plan, kitap, deneme ve görüşme bilgilerini ayrı menülerde aramadan öğrencinin güncel durumunu görün.</p>
      </div>
      <label className="student360-search"><Search/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Öğrenci veya hedef ara" aria-label="Öğrenci ara"/></label>
    </header>

    {rows.length ? <section className="student360-directory-grid">
      {rows.map(row => <NavLink to={`/ogrenciler/${encodeURIComponent(row.profile.ogrenci_id)}`} className="student360-person" key={row.profile.ogrenci_id}>
        <div className="student360-person-top">
          <div className="student360-avatar">{row.name.slice(0, 2).toLocaleUpperCase('tr-TR')}</div>
          <div className="student360-person-copy"><h2>{row.name}</h2><p>{row.profile.sinav_turu || 'Sınav türü belirtilmedi'}</p></div>
          <StudentStatus overdue={row.overdue.length} today={row.dueToday.length}/>
        </div>
        <div className="student360-goal"><Target/><span>{[row.profile.hedef_okul, row.profile.hedef_bolum].filter(Boolean).join(' · ') || 'Hedef henüz girilmedi'}</span></div>
        <div className="student360-mini-stats">
          <span><BookOpenCheck/><b>{row.open.length}</b><small>Açık çalışma</small></span>
          <span><GraduationCap/><b>{row.latestNet != null ? row.latestNet.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '—'}</b><small>{row.latestNet != null ? 'Son net' : 'Deneme yok'}</small></span>
          <span><CalendarDays/><b>{row.nextMeeting ? shortDate(row.nextMeeting.gorusme_tarihi) : '—'}</b><small>Sıradaki görüşme</small></span>
        </div>
        <span className="student360-open">Öğrenciyi aç <ArrowRight/></span>
      </NavLink>)}
    </section> : <div className="student360-empty"><Search/><b>Eşleşen öğrenci yok.</b><span>Arama ifadesini değiştirin.</span></div>}
  </div>
}

export function StudentDetail({ data }: { data: CoachData }) {
  const { studentId = '' } = useParams<{ studentId: string }>()
  const student = data.students.find(x => x.ogrenci_id === studentId)
  const profile = studentProfile(data, studentId)
  const today = isoToday()

  const summary = useMemo(() => {
    const assignments = data.assignments.filter(x => x.ogrenci_id === studentId && !isCancelled(x.durum))
    const open = assignments.filter(x => !isDone(x.durum))
    const overdue = open.filter(x => Boolean(x.son_teslim_tarihi && x.son_teslim_tarihi < today))
    const dueToday = open.filter(x => x.son_teslim_tarihi === today)
    const { start, end } = currentWeekBounds()
    const weekAssignments = assignments.filter(x => {
      const date = x.son_teslim_tarihi || x.verilis_tarihi
      return Boolean(date && date >= start && date <= end)
    })
    const weekDone = weekAssignments.filter(x => isDone(x.durum))
    const completion = weekAssignments.length ? Math.round((weekDone.length / weekAssignments.length) * 100) : null

    const exams = data.exams.filter(x => x.ogrenci_id === studentId).sort((a, b) => b.deneme_tarihi.localeCompare(a.deneme_tarihi))
    const latestExam = exams[0]
    const previousExam = exams[1]
    const latestNet = latestExam ? examTotalNet(data, latestExam.deneme_id) : null
    const previousNet = previousExam ? examTotalNet(data, previousExam.deneme_id) : null
    const netDelta = latestNet != null && previousNet != null ? Math.round((latestNet - previousNet) * 100) / 100 : null
    const latestSections = latestExam
      ? data.examSections.filter(x => x.deneme_id === latestExam.deneme_id).sort((a, b) => Number(a.sira_no || 999) - Number(b.sira_no || 999))
      : []

    const meetings = data.meetings.filter(x => x.ogrenci_id === studentId && x.durum !== 'İptal')
    const nextMeeting = meetings.filter(x => x.gorusme_tarihi >= today).sort((a, b) => a.gorusme_tarihi.localeCompare(b.gorusme_tarihi))[0]
    const lastMeeting = meetings.filter(x => x.gorusme_tarihi < today).sort((a, b) => b.gorusme_tarihi.localeCompare(a.gorusme_tarihi))[0]
    const lastDecisionMeeting = meetings.filter(x => Boolean(x.alinan_kararlar?.trim())).sort((a, b) => b.gorusme_tarihi.localeCompare(a.gorusme_tarihi))[0]

    const studentBooks = data.studentBooks.filter(x => x.ogrenci_id === studentId)
    const books = studentBooks.map(link => {
      const book = data.bookCatalog.find(x => x.kitap_id === link.kitap_id)
      const latestAssignment = assignments
        .filter(x => x.ogrenci_kitap_id === link.ogrenci_kitap_id)
        .sort((a, b) => String(b.verilis_tarihi || b.son_teslim_tarihi || '').localeCompare(String(a.verilis_tarihi || a.son_teslim_tarihi || '')))[0]
      return { link, book, latestAssignment }
    })

    return {
      assignments,
      open,
      overdue,
      dueToday,
      weekAssignments,
      weekDone,
      completion,
      latestExam,
      latestNet,
      previousNet,
      netDelta,
      latestSections,
      nextMeeting,
      lastMeeting,
      lastDecisionMeeting,
      books,
    }
  }, [data, studentId, today])

  if (!student || !profile) return <div className="student360-missing"><NavLink to="/ogrenciler"><ArrowLeft/> Öğrencilere dön</NavLink><b>Öğrenci bulunamadı.</b></div>

  const goal = [profile.hedef_okul, profile.hedef_bolum].filter(Boolean).join(' · ')
  const hasAttention = summary.overdue.length > 0
  const latestScoreText = summary.latestNet != null
    ? `${summary.latestNet.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} net`
    : summary.latestExam?.puan != null
      ? `${summary.latestExam.puan.toLocaleString('tr-TR')} puan`
      : '—'

  return <div className="student360-detail page-stack">
    <NavLink to="/ogrenciler" className="student360-back"><ArrowLeft/> Öğrencilere dön</NavLink>

    <header className="student360-hero">
      <div className="student360-hero-main">
        <div className="student360-avatar large">{student.ad_soyad.slice(0, 2).toLocaleUpperCase('tr-TR')}</div>
        <div><span className="student360-eyebrow">{profile.sinav_turu || 'KOÇLUK ÖĞRENCİSİ'}</span><h1>{student.ad_soyad}</h1><p>{goal || 'Hedef henüz girilmedi'}</p></div>
      </div>
      <StudentStatus overdue={summary.overdue.length} today={summary.dueToday.length}/>
    </header>

    <nav className="student360-quick-actions" aria-label="Öğrenci hızlı işlemleri">
      <NavLink to={`/plan?ogrenci=${encodeURIComponent(studentId)}`}><BookOpenCheck/><span>Plan</span><ArrowRight/></NavLink>
      <NavLink to={`/denemeler?ogrenci=${encodeURIComponent(studentId)}`}><GraduationCap/><span>Denemeler</span><ArrowRight/></NavLink>
      <NavLink to={`/gorusmeler?ogrenci=${encodeURIComponent(studentId)}`}><CalendarDays/><span>Görüşmeler</span><ArrowRight/></NavLink>
    </nav>

    <section className={`student360-focus ${hasAttention ? 'attention' : summary.dueToday.length ? 'today' : 'clear'}`}>
      {hasAttention ? <AlertTriangle/> : <CheckCircle2/>}
      <div>
        <b>{hasAttention ? `${summary.overdue.length} çalışma gecikmiş.` : summary.dueToday.length ? `Bugün ${summary.dueToday.length} çalışma teslim.` : 'Acil takip gerekmiyor.'}</b>
        <span>{hasAttention ? 'Önce geciken planı kontrol edin; diğer bilgiler aşağıda hazır.' : summary.dueToday.length ? 'Bugünkü çalışmalar tamamlandığında öğrenci normal akışa döner.' : 'Plan, deneme ve görüşme akışı şu anda olağan görünüyor.'}</span>
      </div>
      {(hasAttention || summary.dueToday.length > 0) && <NavLink to={`/plan?ogrenci=${encodeURIComponent(studentId)}`}>Planı aç <ArrowRight/></NavLink>}
    </section>

    <section className="student360-snapshot-grid">
      <article><BookOpenCheck/><span>Bu hafta</span><strong>{summary.completion != null ? `%${summary.completion}` : '—'}</strong><small>{summary.weekAssignments.length ? `${summary.weekDone.length}/${summary.weekAssignments.length} çalışma tamamlandı` : 'Bu haftaya ait çalışma yok'}</small></article>
      <article><GraduationCap/><span>Son deneme</span><strong>{latestScoreText}</strong><small>{summary.latestExam ? `${summary.latestExam.deneme_adi} · ${shortDate(summary.latestExam.deneme_tarihi)}` : 'Henüz deneme sonucu yok'}</small></article>
      <article><CalendarDays/><span>Sıradaki görüşme</span><strong>{summary.nextMeeting ? shortDate(summary.nextMeeting.gorusme_tarihi) : '—'}</strong><small>{summary.nextMeeting ? `${summary.nextMeeting.baslangic_saati?.slice(0, 5) || 'Saat yok'} · ${summary.nextMeeting.gundem || summary.nextMeeting.gorusme_turu || 'Koçluk görüşmesi'}` : 'Planlanmış görüşme yok'}</small></article>
    </section>

    <section className="student360-content-grid">
      <article className="student360-panel books-panel">
        <div className="student360-section-head"><div><span>KİTAPLAR & ÇALIŞMA</span><h2>Kaldığı yer hazır</h2></div><NavLink to={`/plan?ogrenci=${encodeURIComponent(studentId)}`}>Plan <ArrowRight/></NavLink></div>
        {summary.books.length ? <div className="student360-book-list">
          {summary.books.slice(0, 4).map(({ link, book, latestAssignment }) => <div className="student360-book" key={link.ogrenci_kitap_id}>
            <span className="student360-book-icon"><BookOpen/></span>
            <div><b>{book?.kitap_adi || 'Kitap'}</b><span>{[book?.yayinevi, book?.ders].filter(Boolean).join(' · ') || 'Öğrenci kitabı'}</span><small>{assignmentPosition(latestAssignment) ? `Son çalışma: ${assignmentPosition(latestAssignment)}` : 'Henüz sayfa/test çalışması verilmedi'}</small></div>
          </div>)}
        </div> : <div className="student360-inline-empty"><BookOpen/><div><b>Öğrenci kitabı yok.</b><span>Kitap eklendiğinde son çalışma noktası burada görünür.</span></div></div>}
      </article>

      <article className="student360-panel exam-panel">
        <div className="student360-section-head"><div><span>DENEME</span><h2>Son sonuç</h2></div><NavLink to={`/denemeler?ogrenci=${encodeURIComponent(studentId)}`}>Tümü <ArrowRight/></NavLink></div>
        {summary.latestExam ? <>
          <div className="student360-exam-head"><div><b>{summary.latestExam.deneme_adi}</b><span>{shortDate(summary.latestExam.deneme_tarihi)}</span></div><strong>{latestScoreText}</strong></div>
          {summary.netDelta != null && <div className={`student360-trend ${summary.netDelta < 0 ? 'down' : summary.netDelta > 0 ? 'up' : 'flat'}`}>
            {summary.netDelta < 0 ? <TrendingDown/> : summary.netDelta > 0 ? <TrendingUp/> : <CheckCircle2/>}
            <span>{summary.netDelta === 0 ? 'Önceki denemeyle aynı toplam net.' : `Önceki denemeye göre ${summary.netDelta > 0 ? '+' : ''}${summary.netDelta.toLocaleString('tr-TR')} net.`}</span>
          </div>}
          {summary.latestSections.length > 0 && <div className="student360-subjects">{summary.latestSections.slice(0, 6).map(section => <span key={section.sonuc_id}><b>{section.bolum_adi}</b><small>{section.net != null ? `${Number(section.net).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} net` : 'Net yok'}</small></span>)}</div>}
        </> : <div className="student360-inline-empty"><GraduationCap/><div><b>Henüz gerçek deneme sonucu yok.</b><span>İlk sonuç eklendiğinde karşılaştırma otomatik oluşur.</span></div></div>}
      </article>

      <article className="student360-panel meeting-panel">
        <div className="student360-section-head"><div><span>GÖRÜŞME</span><h2>Hazırlık özeti</h2></div><NavLink to={`/gorusmeler?ogrenci=${encodeURIComponent(studentId)}`}>Tümü <ArrowRight/></NavLink></div>
        {summary.nextMeeting ? <div className="student360-meeting-next"><CalendarDays/><div><b>{shortDate(summary.nextMeeting.gorusme_tarihi)}{summary.nextMeeting.baslangic_saati ? ` · ${summary.nextMeeting.baslangic_saati.slice(0, 5)}` : ''}</b><span>{summary.nextMeeting.gundem || summary.nextMeeting.gorusme_turu || 'Koçluk görüşmesi'}</span></div></div> : <div className="student360-inline-empty compact"><CalendarDays/><div><b>Yaklaşan görüşme yok.</b><span>Yeni görüşme planlandığında burada öne çıkar.</span></div></div>}
        {summary.lastDecisionMeeting?.alinan_kararlar && <div className="student360-decision"><span>SON KARAR</span><p>{summary.lastDecisionMeeting.alinan_kararlar}</p><small>{shortDate(summary.lastDecisionMeeting.gorusme_tarihi)}</small></div>}
        {!summary.lastDecisionMeeting?.alinan_kararlar && summary.lastMeeting && <div className="student360-decision muted"><span>SON GÖRÜŞME</span><p>{summary.lastMeeting.gundem || summary.lastMeeting.gorusme_turu || 'Koçluk görüşmesi'}</p><small>{shortDate(summary.lastMeeting.gorusme_tarihi)}</small></div>}
      </article>
    </section>
  </div>
}
