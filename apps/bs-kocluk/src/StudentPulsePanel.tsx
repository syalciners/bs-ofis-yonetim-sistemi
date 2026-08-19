import { AlertTriangle, ArrowRight, CheckCircle2, Eye, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { StudentPulse } from './studentPulse'

export function StudentPulsePanel({ pulse }: { pulse: StudentPulse }) {
  const Icon = pulse.level === 'attention' ? AlertTriangle : pulse.level === 'watch' ? Eye : CheckCircle2
  const visibleSignals = pulse.signals.slice(0, 3)

  return <section className={`student-pulse-panel ${pulse.level}`} aria-label="Öğrenci Nabzı">
    <div className="student-pulse-heading">
      <div className="student-pulse-icon"><Icon/></div>
      <div>
        <span><Sparkles/> ÖĞRENCİ NABZI</span>
        <h2>{pulse.label}</h2>
        <p>{pulse.headline}</p>
      </div>
      <NavLink to={pulse.primaryAction.to}>{pulse.primaryAction.label} <ArrowRight/></NavLink>
    </div>

    <div className="student-pulse-signals">
      {visibleSignals.map(signal => <article key={signal.id} className={signal.severity}>
        <span className="student-pulse-dot" aria-hidden="true"/>
        <div><b>{signal.title}</b><p>{signal.detail}</p></div>
      </article>)}
    </div>

    <div className="student-pulse-note">Bu değerlendirme mevcut plan, deneme ve görüşme verilerinden açıklanabilir kurallarla üretilir; koçun profesyonel kararının yerini almaz.</div>
  </section>
}
