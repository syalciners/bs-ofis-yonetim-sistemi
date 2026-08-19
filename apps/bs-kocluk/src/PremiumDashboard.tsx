import { AlertTriangle, ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, Clock3, Sparkles, UsersRound } from 'lucide-react'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { isCancelled, isDone, isoToday, shortDate, studentName, type Assignment, type CoachData, type Meeting } from './data'

type FocusItem =
  | { type: 'overdue' | 'today-assignment'; assignment: Assignment }
  | { type: 'today-meeting'; meeting: Meeting }

export function PremiumDashboard({ data }: { data: CoachData }) {
  const summary = useMemo(() => {
    const today = isoToday()
    const openAssignments = data.assignments.filter(x => !isDone(x.durum) && !isCancelled(x.durum))
    const overdue = openAssignments.filter(x => Boolean(x.son_teslim_tarihi && x.son_teslim_tarihi < today))
    const dueToday = openAssignments.filter(x => x.son_teslim_tarihi === today)
    const todayMeetings = data.meetings
      .filter(x => x.gorusme_tarihi === today && x.durum !== 'İptal')
      .sort((a, b) => String(a.baslangic_saati || '').localeCompare(String(b.baslangic_saati || '')))
    const upcomingMeetings = data.meetings
      .filter(x => x.gorusme_tarihi > today && x.durum !== 'İptal')
      .sort((a, b) => a.gorusme_tarihi.localeCompare(b.gorusme_tarihi))

    const attention = new Map<string, Assignment[]>()
    overdue.forEach(item => {
      const current = attention.get(item.ogrenci_id) || []
      current.push(item)
      attention.set(item.ogrenci_id, current)
    })

    const attentionStudents = [...attention.entries()].sort((a, b) => b[1].length - a[1].length)
    const attentionIds = new Set(attentionStudents.map(([id]) => id))
    const healthyCount = Math.max(0, data.coachingProfiles.length - attentionIds.size)

    const focusItems: FocusItem[] = [
      ...overdue.map(assignment => ({ type: 'overdue' as const, assignment })),
      ...dueToday.map(assignment => ({ type: 'today-assignment' as const, assignment })),
      ...todayMeetings.map(meeting => ({ type: 'today-meeting' as const, meeting })),
    ].slice(0, 5)

    return {
      openAssignments,
      overdue,
      dueToday,
      todayMeetings,
      upcomingMeetings,
      attentionStudents,
      healthyCount,
      focusItems,
      todayWorkCount: dueToday.length + todayMeetings.length,
      focusCount: overdue.length + dueToday.length + todayMeetings.length,
    }
  }, [data])

  const nextMeeting = summary.todayMeetings[0] || summary.upcomingMeetings[0]

  return <div className="premium-dashboard page-stack">
    <header className="premium-hero">
      <div>
        <span className="premium-eyebrow"><Sparkles size={14}/> KOÇ MASASI</span>
        <h1>Bugün neye odaklanmalısınız?</h1>
        <p>Sistem normal akışı geri planda tutar; yalnız karar veya takip gerektiren işleri öne çıkarır.</p>
      </div>
      <div className={`focus-state ${summary.focusCount > 0 ? 'needs-attention' : 'all-clear'}`}>
        {summary.focusCount > 0 ? <AlertTriangle/> : <CheckCircle2/>}
        <div>
          <strong>{summary.focusCount > 0 ? `${summary.focusCount} öncelikli iş` : 'Her şey yolunda'}</strong>
          <span>{summary.focusCount > 0 ? 'Önce bunları tamamlayın.' : 'Şu anda acil takip gerekmiyor.'}</span>
        </div>
      </div>
    </header>

    <section className="premium-stat-grid" aria-label="Günlük özet">
      <NavLink to="/plan" className="premium-stat urgent">
        <AlertTriangle/><div><span>Geciken</span><strong>{summary.overdue.length}</strong></div><ArrowRight/>
      </NavLink>
      <NavLink to="/plan" className="premium-stat today">
        <Clock3/><div><span>Bugün</span><strong>{summary.todayWorkCount}</strong></div><ArrowRight/>
      </NavLink>
      <NavLink to="/gorusmeler" className="premium-stat meeting">
        <CalendarDays/><div><span>Sıradaki Görüşme</span><strong>{nextMeeting ? shortDate(nextMeeting.gorusme_tarihi) : '—'}</strong></div><ArrowRight/>
      </NavLink>
    </section>

    <section className="premium-panel priority-panel">
      <div className="premium-section-head">
        <div><span>GÜNLÜK AKIŞ</span><h2>Önce bunları yapın</h2></div>
        <NavLink to="/plan">Planı aç <ArrowRight size={15}/></NavLink>
      </div>
      {summary.focusItems.length ? <div className="priority-list">
        {summary.focusItems.map((item, index) => {
          if (item.type === 'today-meeting') {
            const meeting = item.meeting
            return <NavLink to="/gorusmeler" className="priority-item" key={`meeting-${meeting.gorusme_id}`}>
              <span className="priority-number">{index + 1}</span>
              <span className="priority-icon meeting"><CalendarDays/></span>
              <span className="priority-copy"><b>{studentName(data, meeting.ogrenci_id)}</b><small>{meeting.baslangic_saati ? `${meeting.baslangic_saati.slice(0, 5)} · ` : ''}{meeting.gundem || 'Bugünkü koçluk görüşmesi'}</small></span>
              <span className="priority-tag">Görüşme</span><ArrowRight/>
            </NavLink>
          }
          const assignment = item.assignment
          return <NavLink to="/plan" className="priority-item" key={`assignment-${assignment.odev_id}`}>
            <span className="priority-number">{index + 1}</span>
            <span className={`priority-icon ${item.type === 'overdue' ? 'overdue' : 'study'}`}><BookOpenCheck/></span>
            <span className="priority-copy"><b>{studentName(data, assignment.ogrenci_id)}</b><small>{assignment.odev_basligi || assignment.konu || 'Çalışma'} · {item.type === 'overdue' ? 'Gecikti' : 'Bugün teslim'}</small></span>
            <span className={`priority-tag ${item.type === 'overdue' ? 'danger' : ''}`}>{item.type === 'overdue' ? shortDate(assignment.son_teslim_tarihi) : 'Bugün'}</span><ArrowRight/>
          </NavLink>
        })}
      </div> : <div className="premium-empty-success"><CheckCircle2/><div><b>Bugünkü kritik işler tamam.</b><span>Yeni bir gecikme veya bugünkü görüşme oluştuğunda burada görünecek.</span></div></div>}
    </section>

    <section className="premium-panel">
      <div className="premium-section-head">
        <div><span>İSTİSNA TAKİBİ</span><h2>Dikkat gereken öğrenciler</h2></div>
        <span className="quiet-count">{summary.attentionStudents.length} öğrenci</span>
      </div>
      {summary.attentionStudents.length ? <div className="attention-grid">
        {summary.attentionStudents.slice(0, 6).map(([studentId, assignments]) => <NavLink to="/plan" className="attention-card" key={studentId}>
          <div className="attention-avatar">{studentName(data, studentId).slice(0, 2).toLocaleUpperCase('tr-TR')}</div>
          <div><b>{studentName(data, studentId)}</b><span>{assignments.length} geciken çalışma</span><small>Planı kontrol et</small></div>
          <ArrowRight/>
        </NavLink>)}
      </div> : <div className="premium-empty-success compact"><CheckCircle2/><div><b>Dikkat gerektiren öğrenci yok.</b><span>Geciken çalışma oluşursa öğrenci otomatik olarak bu alana gelir.</span></div></div>}
    </section>

    <section className="healthy-strip">
      <div className="healthy-icon"><UsersRound/></div>
      <div><b>{summary.healthyCount} öğrenci normal akışta</b><span>Her şey yolunda olan öğrencileri ana ekranı kalabalıklaştırmamak için geri planda tutuyoruz.</span></div>
      <NavLink to="/ogrenciler">Öğrenciler <ArrowRight size={14}/></NavLink>
    </section>
  </div>
}
