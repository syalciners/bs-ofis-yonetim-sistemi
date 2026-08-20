import { Activity, ArrowRight, BarChart3, BookOpenCheck, CheckCircle2, GraduationCap, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { shortDate, type CoachData } from './data'
import { buildStudentDevelopment, type ExamTrendPoint } from './studentDevelopment'

function Sparkline({ points }: { points: ExamTrendPoint[] }) {
  if (points.length < 2) return null
  const values = points.map(point => point.net)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = Math.max(1, max - min)
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 50 : 8 + (index / (points.length - 1)) * 84
    const y = 82 - ((point.net - min) / spread) * 64
    return { x, y, point }
  })
  const path = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ')

  return <div className="development-sparkline" aria-label="Deneme net gelişimi">
    <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
      <path d={path}/>
      {coords.map(coord => <circle key={coord.point.examId} cx={coord.x} cy={coord.y} r="3.2"/>)}
    </svg>
    <div className="development-sparkline-labels">{points.map(point => <span key={point.examId}><b>{point.net.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</b><small>{shortDate(point.date).slice(0, 5)}</small></span>)}</div>
  </div>
}

export function StudentDevelopmentPanel({ data, studentId }: { data: CoachData; studentId: string }) {
  const development = useMemo(() => buildStudentDevelopment(data, studentId), [data, studentId])
  const rhythm = development.rhythm
  const exams = development.exams

  return <section className="student-development-panel" aria-labelledby="student-development-title">
    <header className="student-development-head">
      <div>
        <span><Activity/> ÇALIŞMA RİTMİ & GELİŞİM</span>
        <h2 id="student-development-title">Son haftalar tek bakışta</h2>
        <p>Ek veri girişi istemeden plan gerçekleşmesi ve karşılaştırılabilir deneme sonuçlarından açıklanabilir trendler üretir.</p>
      </div>
      <span className={`development-rhythm-badge ${rhythm.level}`}>{rhythm.label}</span>
    </header>

    <div className="development-metric-grid">
      <article>
        <BookOpenCheck/>
        <span>Son 4 hafta</span>
        <strong>{rhythm.recentCompletion != null ? `%${rhythm.recentCompletion}` : '—'}</strong>
        <small>{rhythm.completionDelta != null ? `${rhythm.completionDelta > 0 ? '+' : ''}${rhythm.completionDelta} puan / önceki 4 hafta` : 'Karşılaştırma için veri birikiyor'}</small>
      </article>
      <article>
        <CheckCircle2/>
        <span>Düzenli hafta serisi</span>
        <strong>{rhythm.steadyWeekStreak}</strong>
        <small>%70+ gerçekleşme gösteren tamamlanmış ardışık haftalar</small>
      </article>
      <article className={rhythm.currentBacklog > 0 ? 'attention' : ''}>
        <BarChart3/>
        <span>Mevcut birikme</span>
        <strong>{rhythm.currentBacklog}</strong>
        <small>{rhythm.currentBacklog ? 'Teslim tarihi geçmiş açık çalışma' : 'Şu anda geciken açık çalışma yok'}</small>
      </article>
    </div>

    <div className="development-main-grid">
      <article className="development-card rhythm-card">
        <div className="development-card-head"><div><span>8 HAFTA</span><h3>Çalışma ritmi</h3></div><NavLink to={`/plan?ogrenci=${encodeURIComponent(studentId)}`}>Planı aç <ArrowRight/></NavLink></div>
        <p className="development-rhythm-copy">{rhythm.description}</p>
        <div className="development-week-chart" aria-label="Sekiz haftalık plan tamamlama oranları">
          {rhythm.weeks.map(week => <div className={`development-week ${week.current ? 'current' : ''} ${week.total ? '' : 'empty'}`} key={week.start}>
            <div className="development-week-bar-wrap"><span className="development-week-bar" style={{ height: `${week.completion == null ? 4 : Math.max(8, week.completion)}%` }}/></div>
            <b>{week.completion != null ? `%${week.completion}` : '—'}</b>
            <small>{week.current ? 'Bu hafta' : week.label}</small>
            <em>{week.total ? `${week.done}/${week.total}` : 'veri yok'}</em>
          </div>)}
        </div>
        <small className="development-method-note">Tamamlama oranı, o haftaya tarihlenmiş gerçek çalışmaların mevcut durumundan hesaplanır. Sistem geçmişte bir işin tam olarak hangi gün tamamlandığını tahmin etmez.</small>
      </article>

      <article className="development-card exam-development-card">
        <div className="development-card-head"><div><span>DENEME GELİŞİMİ</span><h3>{exams.type ? `${exams.type} karşılaştırması` : 'Karşılaştırılabilir sonuç'}</h3></div><NavLink to={`/denemeler?ogrenci=${encodeURIComponent(studentId)}`}>Denemeler <ArrowRight/></NavLink></div>
        {exams.points.length >= 2 ? <>
          <div className="development-exam-summary">
            <GraduationCap/>
            <div><span>Son net</span><strong>{exams.latestNet?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</strong></div>
            {exams.delta != null && <span className={`development-exam-delta ${exams.delta > 0 ? 'up' : exams.delta < 0 ? 'down' : 'flat'}`}>{exams.delta > 0 ? <TrendingUp/> : exams.delta < 0 ? <TrendingDown/> : <CheckCircle2/>}{exams.delta > 0 ? '+' : ''}{exams.delta.toLocaleString('tr-TR')} net</span>}
          </div>
          <Sparkline points={exams.points}/>
          {exams.subjectTrends.length > 0 && <div className="development-subject-trends">{exams.subjectTrends.map(row => <span className={row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : 'flat'} key={row.name}><b>{row.name}</b><small>{row.delta > 0 ? '+' : ''}{row.delta.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} net</small></span>)}</div>}
          <small className="development-method-note">Yalnız aynı sınav türündeki gerçek sonuçlar karşılaştırılır. Değişimin nedeni hakkında otomatik varsayım yapılmaz.</small>
        </> : <div className="development-empty"><GraduationCap/><div><b>Henüz trend için yeterli deneme yok.</b><span>Aynı sınav türünde en az iki net sonucu oluştuğunda gelişim çizgisi otomatik görünecek.</span></div></div>}
      </article>
    </div>

    <article className="development-insight-card">
      <div className="development-insight-icon"><Activity/></div>
      <div><span>SİSTEMİN OKUDUĞU GERÇEKLER</span><h3>Koç için kısa özet</h3><ul>{development.insights.map((insight, index) => <li key={`${index}-${insight}`}>{insight}</li>)}</ul></div>
    </article>
  </section>
}
