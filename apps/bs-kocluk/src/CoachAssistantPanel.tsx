import { ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, GraduationCap, MessageCircle, Sparkles, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { buildCoachAssistantCandidates, rankCoachAssistantCandidates, type AssistantActionType, type AssistantRanking } from './coachAssistant'
import { studentName, type CoachData } from './data'

function ActionIcon({ type }: { type: AssistantActionType }) {
  if (type === 'plan-balance' || type === 'weekly-plan') return <BookOpenCheck/>
  if (type === 'exam-review') return <GraduationCap/>
  if (type === 'meeting-prepare' || type === 'decision-action') return <CalendarDays/>
  if (type === 'parent-summary') return <MessageCircle/>
  return <Target/>
}

export function CoachAssistantPanel({ data }: { data: CoachData }) {
  const candidates = useMemo(() => buildCoachAssistantCandidates(data), [data])
  const [ranking, setRanking] = useState<AssistantRanking>(() => ({
    actions: candidates.slice(0, 3).map(item => ({ ...item, aiReason: item.fallbackReason })),
    aiActive: false,
  }))
  const [loadingAi, setLoadingAi] = useState(candidates.length > 1)

  useEffect(() => {
    let live = true
    const immediate: AssistantRanking = {
      actions: candidates.slice(0, 3).map(item => ({ ...item, aiReason: item.fallbackReason })),
      aiActive: false,
    }
    setRanking(immediate)
    setLoadingAi(candidates.length > 1)
    if (candidates.length <= 1) return () => { live = false }

    void rankCoachAssistantCandidates(candidates).then(result => {
      if (!live) return
      setRanking(result)
      setLoadingAi(false)
    })
    return () => { live = false }
  }, [candidates])

  return <section className="premium-panel coach-assistant-panel" aria-label="Proaktif koç asistanı">
    <div className="coach-assistant-head">
      <div>
        <span><Sparkles/> PROAKTİF ASİSTAN</span>
        <h2>Siz sormadan hazır</h2>
        <p>Sistem yalnız gerçek veriden aksiyon adayları çıkarır; AI bunları önceliklendirir, hiçbir işlemi kendiliğinden yapmaz.</p>
      </div>
      <span className={`coach-assistant-state ${ranking.aiActive ? 'active' : ''}`}><Sparkles/>{loadingAi ? 'Önceliklendiriliyor' : ranking.aiActive ? 'AI önceliklendirdi' : 'Güvenli öncelik'}</span>
    </div>

    {ranking.actions.length ? <div className="coach-assistant-grid">
      {ranking.actions.map(action => <article className={`coach-assistant-card ${action.tone}`} key={action.id}>
        <div className="coach-assistant-icon"><ActionIcon type={action.type}/></div>
        <div className="coach-assistant-copy">
          <span>{studentName(data, action.studentId)}</span>
          <h3>{action.title}</h3>
          <p>{action.detail}</p>
          <small><Sparkles/> {action.aiReason}</small>
        </div>
        <NavLink to={action.to}>{action.cta}<ArrowRight/></NavLink>
      </article>)}
    </div> : <div className="coach-assistant-clear"><CheckCircle2/><div><b>Şu anda yeni bir karar gerekmiyor.</b><span>Plan, deneme, görüşme veya veli bilgilendirmesi için anlamlı bir ihtiyaç oluştuğunda asistan burada yalnız gerekli aksiyonu gösterecek.</span></div></div>}
  </section>
}
