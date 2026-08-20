import { AlertTriangle, BookOpenCheck, CalendarDays, CheckCircle2, ChevronRight, Clock3, GraduationCap, MessageCircleQuestion, Sparkles, Target, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { examTotalNet, isCancelled, isDone, isoToday, shortDate, studentName, type CoachData, type Meeting } from './data'

function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day + days))
  return value.toISOString().slice(0, 10)
}

function timeText(value?: string | null) {
  return value ? value.slice(0, 5) : 'Saat belirtilmedi'
}

function meetingTitle(meeting: Meeting) {
  return meeting.gundem?.trim() || meeting.gorusme_turu?.trim() || 'Koçluk görüşmesi'
}

function previousMeetingWithDecision(data: CoachData, meeting: Meeting) {
  return data.meetings
    .filter(item => item.ogrenci_id === meeting.ogrenci_id && item.gorusme_id !== meeting.gorusme_id && item.durum !== 'İptal' && item.gorusme_tarihi < meeting.gorusme_tarihi && item.alinan_kararlar?.trim())
    .sort((a, b) => b.gorusme_tarihi.localeCompare(a.gorusme_tarihi))[0] || null
}

function meetingBrief(data: CoachData, meeting: Meeting) {
  const today = isoToday()
  const start = addDays(today, -6)
  const nextWeek = addDays(today, 7)
  const assignments = data.assignments.filter(item => item.ogrenci_id === meeting.ogrenci_id && !isCancelled(item.durum))
  const dueThisWeek = assignments.filter(item => item.son_teslim_tarihi && item.son_teslim_tarihi >= start && item.son_teslim_tarihi <= today)
  const doneThisWeek = dueThisWeek.filter(item => isDone(item.durum))
  const overdue = assignments.filter(item => item.son_teslim_tarihi && item.son_teslim_tarihi < today && !isDone(item.durum))
  const upcoming = assignments.filter(item => item.son_teslim_tarihi && item.son_teslim_tarihi >= today && item.son_teslim_tarihi <= nextWeek && !isDone(item.durum))

  const recentExams = data.exams
    .filter(item => item.ogrenci_id === meeting.ogrenci_id && item.deneme_tarihi >= start && item.deneme_tarihi <= today)
    .sort((a, b) => b.deneme_tarihi.localeCompare(a.deneme_tarihi))
  const latestExam = recentExams[0] || null
  const latestNet = latestExam ? examTotalNet(data, latestExam.deneme_id) : null
  const previousComparable = latestExam
    ? data.exams
      .filter(item => item.ogrenci_id === meeting.ogrenci_id && item.sinav_turu === latestExam.sinav_turu && item.deneme_tarihi < latestExam.deneme_tarihi)
      .sort((a, b) => b.deneme_tarihi.localeCompare(a.deneme_tarihi))[0] || null
    : null
  const previousNet = previousComparable ? examTotalNet(data, previousComparable.deneme_id) : null
  const delta = latestNet != null && previousNet != null ? Math.round((latestNet - previousNet) * 100) / 100 : null
  const previousMeeting = previousMeetingWithDecision(data, meeting)

  const prompts: string[] = []
  if (previousMeeting?.alinan_kararlar?.trim()) prompts.push('Önceki görüşmede alınan karar ne ölçüde uygulandı?')
  if (overdue.length > 0) prompts.push(`${overdue.length} geciken çalışma için asıl engel neydi?`)
  if (dueThisWeek.length >= 2 && doneThisWeek.length / dueThisWeek.length < 0.5) prompts.push('Bu haftaki çalışma planı öğrenci için gerçekçi miydi?')
  if (delta != null && delta < 0) prompts.push(`Son karşılaştırılabilir denemede ${Math.abs(delta).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} net düşüş var. Öğrenci bunu nasıl açıklıyor?`)
  if (delta != null && delta > 0) prompts.push(`Son karşılaştırılabilir denemede +${delta.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} net gelişim var. Bu gelişimi sağlayan neydi?`)
  if (!prompts.length && upcoming.length > 0) prompts.push('Önümüzdeki 7 günlük planın en önemli tek hedefi ne olmalı?')
  if (!prompts.length) prompts.push('Bu hafta ne iyi gitti ve bunu gelecek haftaya nasıl taşıyacağız?')

  return {
    start,
    today,
    dueThisWeek,
    doneThisWeek,
    overdue,
    upcoming,
    latestExam,
    latestNet,
    delta,
    previousMeeting,
    prompts: prompts.slice(0, 3),
  }
}

function BriefSheet({ data, meeting, onClose }: { data: CoachData; meeting: Meeting; onClose: () => void }) {
  const brief = useMemo(() => meetingBrief(data, meeting), [data, meeting])
  const name = studentName(data, meeting.ogrenci_id)
  const completion = brief.dueThisWeek.length ? Math.round((brief.doneThisWeek.length / brief.dueThisWeek.length) * 100) : null

  return <div className="meeting-brief-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="meeting-brief-sheet" role="dialog" aria-modal="true" aria-labelledby="meeting-brief-title">
      <header className="meeting-brief-head">
        <div><span><Sparkles/> OTOMATİK GÖRÜŞME HAZIRLIĞI</span><h2 id="meeting-brief-title">{name}</h2><p>{shortDate(meeting.gorusme_tarihi)} · {timeText(meeting.baslangic_saati)} · {meetingTitle(meeting)}</p></div>
        <button type="button" onClick={onClose} aria-label="Kapat"><X/></button>
      </header>

      <div className="meeting-brief-body">
        <div className="meeting-window-note"><CalendarDays/><div><b>Son 7 gün otomatik özetlendi</b><span>{shortDate(brief.start)} – {shortDate(brief.today)} arasındaki gerçek kayıtlar kullanıldı.</span></div></div>

        <div className="meeting-kpis">
          <article><span><BookOpenCheck/></span><small>Teslim tarihi gelen</small><b>{brief.dueThisWeek.length}</b><em>{completion == null ? 'Bu hafta kayıt yok' : `%${completion} tamamlandı`}</em></article>
          <article className={brief.overdue.length ? 'attention' : ''}><span><AlertTriangle/></span><small>Şu an geciken</small><b>{brief.overdue.length}</b><em>{brief.overdue.length ? 'Görüşmede ele al' : 'Gecikme görünmüyor'}</em></article>
          <article><span><Target/></span><small>Önümüzdeki 7 gün</small><b>{brief.upcoming.length}</b><em>Açık çalışma</em></article>
          <article><span><GraduationCap/></span><small>Son deneme</small><b>{brief.latestNet == null ? '—' : brief.latestNet.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</b><em>{brief.latestExam ? `${brief.latestExam.sinav_turu} · ${shortDate(brief.latestExam.deneme_tarihi)}` : 'Son 7 günde deneme yok'}</em></article>
        </div>

        {brief.latestExam && <section className="meeting-brief-block">
          <div className="meeting-block-title"><GraduationCap/><div><b>Deneme sinyali</b><span>{brief.latestExam.deneme_adi}</span></div></div>
          <div className="meeting-exam-line"><strong>{brief.latestNet == null ? 'Net hesaplanamadı' : `${brief.latestNet.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} net`}</strong>{brief.delta == null ? <span>Karşılaştırılabilir önceki deneme yok.</span> : <span className={brief.delta < 0 ? 'down' : brief.delta > 0 ? 'up' : ''}>{brief.delta > 0 ? '+' : ''}{brief.delta.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} net değişim</span>}</div>
        </section>}

        <section className="meeting-brief-block">
          <div className="meeting-block-title"><CheckCircle2/><div><b>Önceki görüşme kararı</b><span>{brief.previousMeeting ? shortDate(brief.previousMeeting.gorusme_tarihi) : 'Kayıt yok'}</span></div></div>
          <p className={brief.previousMeeting ? '' : 'muted'}>{brief.previousMeeting?.alinan_kararlar?.trim() || 'Daha önce kaydedilmiş bir karar bulunmuyor.'}</p>
        </section>

        <section className="meeting-brief-block questions">
          <div className="meeting-block-title"><MessageCircleQuestion/><div><b>Görüşmede sor</b><span>Sistem veriden soru çıkarır; yorum uydurmaz.</span></div></div>
          <div className="meeting-question-list">{brief.prompts.map((prompt, index) => <div key={prompt}><span>{index + 1}</span><p>{prompt}</p></div>)}</div>
        </section>
      </div>

      <footer className="meeting-brief-actions"><button type="button" onClick={onClose}>Kapat</button><NavLink className="primary" to={`/ogrenciler/${encodeURIComponent(meeting.ogrenci_id)}`} onClick={onClose}>Öğrenci 360 <ChevronRight/></NavLink></footer>
    </section>
  </div>
}

function MeetingCard({ data, meeting, canPrepare, onPrepare }: { data: CoachData; meeting: Meeting; canPrepare: boolean; onPrepare: () => void }) {
  return <article className="meeting-card">
    <div className="meeting-card-date"><CalendarDays/><b>{shortDate(meeting.gorusme_tarihi)}</b><span>{timeText(meeting.baslangic_saati)}</span></div>
    <div className="meeting-card-copy"><div><strong>{studentName(data, meeting.ogrenci_id)}</strong><span>{meeting.gorusme_turu || 'Koçluk görüşmesi'}</span></div><h3>{meetingTitle(meeting)}</h3>{meeting.alinan_kararlar?.trim() && <p><b>Son karar:</b> {meeting.alinan_kararlar}</p>}</div>
    <div className="meeting-card-side"><span className={`meeting-status ${meeting.durum === 'Tamamlandı' ? 'done' : ''}`}>{meeting.durum}</span>{canPrepare && <button type="button" onClick={onPrepare}><Sparkles/> Hazırlığı Aç</button>}</div>
  </article>
}

export function MeetingCenter({ data }: { data: CoachData }) {
  const [params] = useSearchParams()
  const requested = params.get('ogrenci') || ''
  const studentId = data.coachingProfiles.some(item => item.ogrenci_id === requested) ? requested : ''
  const [selected, setSelected] = useState<Meeting | null>(null)
  const today = isoToday()

  const rows = data.meetings
    .filter(item => item.durum !== 'İptal' && (!studentId || item.ogrenci_id === studentId))
  const upcoming = rows
    .filter(item => item.gorusme_tarihi >= today && item.durum !== 'Tamamlandı')
    .sort((a, b) => a.gorusme_tarihi.localeCompare(b.gorusme_tarihi) || String(a.baslangic_saati || '').localeCompare(String(b.baslangic_saati || '')))
  const history = rows
    .filter(item => item.gorusme_tarihi < today || item.durum === 'Tamamlandı')
    .sort((a, b) => b.gorusme_tarihi.localeCompare(a.gorusme_tarihi))
  const next = upcoming[0] || null

  return <div className="page-stack meeting-center">
    <div className="meeting-center-title"><header className="page-title"><h1>Görüşme Merkezi</h1><p>Koç görüşmeden önce veri aramaz; son 7 gün otomatik hazırlanır.</p></header></div>

    {studentId && <div className="student-filter-strip"><div><CalendarDays/><div><strong>{studentName(data, studentId)}</strong><span>Görüşme filtresi aktif</span></div></div><div><NavLink to={`/ogrenciler/${encodeURIComponent(studentId)}`}>360’a dön</NavLink><NavLink to="/gorusmeler">Tümünü göster</NavLink></div></div>}

    {next ? <section className="next-meeting-hero">
      <div className="next-meeting-icon"><Clock3/></div>
      <div className="next-meeting-copy"><span>SIRADAKİ GÖRÜŞME</span><h2>{studentName(data, next.ogrenci_id)}</h2><p>{meetingTitle(next)}</p><small>{shortDate(next.gorusme_tarihi)} · {timeText(next.baslangic_saati)} · {next.gorusme_turu || 'Koçluk görüşmesi'}</small></div>
      <button type="button" onClick={() => setSelected(next)}><Sparkles/> Hazırlığı Aç</button>
    </section> : <div className="meeting-empty-focus"><CheckCircle2/><div><b>Yaklaşan görüşme yok</b><span>Yeni bir görüşme planlandığında 7 günlük hazırlık burada otomatik oluşacak.</span></div></div>}

    {upcoming.length > 1 && <section className="meeting-section"><div className="meeting-section-head"><div><span>YAKLAŞAN</span><h2>Sonraki görüşmeler</h2></div><small>{upcoming.length - 1} görüşme</small></div><div className="meeting-list">{upcoming.slice(1).map(meeting => <MeetingCard key={meeting.gorusme_id} data={data} meeting={meeting} canPrepare onPrepare={() => setSelected(meeting)}/>)}</div></section>}

    <section className="meeting-section"><div className="meeting-section-head"><div><span>GEÇMİŞ</span><h2>Görüşme geçmişi</h2></div><small>{history.length} kayıt</small></div>{history.length ? <div className="meeting-list">{history.map(meeting => <MeetingCard key={meeting.gorusme_id} data={data} meeting={meeting} canPrepare={false} onPrepare={() => undefined}/>)}</div> : <div className="empty">{studentId ? 'Bu öğrenci için tamamlanmış görüşme yok.' : 'Tamamlanmış görüşme kaydı yok.'}</div>}</section>

    {selected && <BriefSheet data={data} meeting={selected} onClose={() => setSelected(null)}/>} 
  </div>
}
