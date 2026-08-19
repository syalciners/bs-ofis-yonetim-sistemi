import { AlertTriangle, ArrowLeft, ClipboardCheck, Minus, Plus, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExamResultForm } from '../components/ExamResultForm'
import { Sheet } from '../components/Sheet'
import { useAppData } from '../components/AppDataProvider'
import { useToast } from '../components/Toast'
import { addDays, fullDate, shortDate, todayISO } from '../lib/format'
import { loadCoachingProfiles, type KoclukOgrenciProfili } from '../services/coachingService'
import { examSections, loadCoachingExamData, totalExamNet, type KoclukDenemeBolumSonucu, type KoclukDenemeSinavi } from '../services/examService'
import { studentName } from '../services/metrics'

type ExamView = {
  exam: KoclukDenemeSinavi
  sections: KoclukDenemeBolumSonucu[]
  totalNet: number
}

type Signal = {
  key: string
  tone: 'down' | 'up' | 'neutral'
  studentId: string
  title: string
  detail: string
  delta?: number
  examId: string
}

const fmtNet = (value: number) => value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function ExamCenterPage() {
  const { data } = useAppData()
  const { toast } = useToast()
  const nav = useNavigate()
  const [profiles, setProfiles] = useState<KoclukOgrenciProfili[]>([])
  const [exams, setExams] = useState<KoclukDenemeSinavi[]>([])
  const [sections, setSections] = useState<KoclukDenemeBolumSonucu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newExam, setNewExam] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRows, examData] = await Promise.all([loadCoachingProfiles(), loadCoachingExamData()])
      setProfiles(profileRows)
      setExams(examData.exams)
      setSections(examData.sections)
      setError(null)
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const views = useMemo<ExamView[]>(() => exams
    .filter(x => x.onay_durumu === 'Onaylandı')
    .map(exam => ({ exam, sections: examSections(exam.deneme_id, sections), totalNet: totalExamNet(exam.deneme_id, sections) }))
    .sort((a, b) => `${b.exam.deneme_tarihi} ${b.exam.guncellenme_zamani || ''}`.localeCompare(`${a.exam.deneme_tarihi} ${a.exam.guncellenme_zamani || ''}`)), [exams, sections])

  const previousFor = useCallback((view: ExamView) => views.find(candidate =>
    candidate.exam.deneme_id !== view.exam.deneme_id &&
    candidate.exam.ogrenci_id === view.exam.ogrenci_id &&
    candidate.exam.sinav_turu === view.exam.sinav_turu &&
    candidate.exam.deneme_tarihi < view.exam.deneme_tarihi
  ), [views])

  const signals = useMemo<Signal[]>(() => {
    const result: Signal[] = []
    const latestByStudent = new Map<string, ExamView>()
    for (const view of views) if (!latestByStudent.has(view.exam.ogrenci_id)) latestByStudent.set(view.exam.ogrenci_id, view)

    for (const view of latestByStudent.values()) {
      const previous = views.find(candidate => candidate.exam.deneme_id !== view.exam.deneme_id && candidate.exam.ogrenci_id === view.exam.ogrenci_id && candidate.exam.sinav_turu === view.exam.sinav_turu && candidate.exam.deneme_tarihi < view.exam.deneme_tarihi)
      if (!previous) continue
      const delta = Number((view.totalNet - previous.totalNet).toFixed(2))
      if (delta <= -2) result.push({ key: `total-down-${view.exam.deneme_id}`, tone: 'down', studentId: view.exam.ogrenci_id, title: `Toplam net ${fmtNet(Math.abs(delta))} düştü`, detail: `${previous.exam.deneme_adi} → ${view.exam.deneme_adi}`, delta, examId: view.exam.deneme_id })
      if (delta >= 2) result.push({ key: `total-up-${view.exam.deneme_id}`, tone: 'up', studentId: view.exam.ogrenci_id, title: `Toplam net +${fmtNet(delta)} yükseldi`, detail: `${previous.exam.deneme_adi} → ${view.exam.deneme_adi}`, delta, examId: view.exam.deneme_id })

      const previousByName = new Map(previous.sections.map(x => [x.bolum_adi.toLocaleLowerCase('tr-TR'), x]))
      const sectionChanges = view.sections
        .map(current => ({ current, previous: previousByName.get(current.bolum_adi.toLocaleLowerCase('tr-TR')) }))
        .filter(x => x.previous)
        .map(x => ({ name: x.current.bolum_adi, delta: Number((Number(x.current.net) - Number(x.previous!.net)).toFixed(2)) }))
        .sort((a, b) => a.delta - b.delta)
      const weakest = sectionChanges[0]
      if (weakest && weakest.delta <= -2) result.push({ key: `section-down-${view.exam.deneme_id}-${weakest.name}`, tone: 'down', studentId: view.exam.ogrenci_id, title: `${weakest.name} ${fmtNet(Math.abs(weakest.delta))} net geriledi`, detail: 'Koçun incelemesi gereken en belirgin ders değişimi', delta: weakest.delta, examId: view.exam.deneme_id })
    }
    return result.sort((a, b) => a.tone === b.tone ? Math.abs(b.delta || 0) - Math.abs(a.delta || 0) : a.tone === 'down' ? -1 : 1)
  }, [views])

  if (!data) return null
  const activeProfiles = profiles.filter(x => x.durum === 'Aktif')
  const attentionCount = signals.filter(x => x.tone === 'down').length
  const growthCount = signals.filter(x => x.tone === 'up').length
  const monthStart = addDays(todayISO(), -29)
  const recentCount = views.filter(x => x.exam.deneme_tarihi >= monthStart).length
  const selected = views.find(x => x.exam.deneme_id === selectedId) || null
  const selectedPrevious = selected ? previousFor(selected) : undefined
  const selectedDelta = selected && selectedPrevious ? Number((selected.totalNet - selectedPrevious.totalNet).toFixed(2)) : null

  return <div className="page-stack exam-center-page">
    <section className="page-title-row">
      <div><span className="eyebrow">KOÇLUK · PREMIUM TAKİP</span><h1>Deneme Merkezi</h1><p className="page-subtitle">Sonucu saklamak yerine değişimi görün, nedeni anlayın, aksiyona dönüştürün.</p></div>
      <div className="form-actions"><button className="secondary-btn" type="button" onClick={() => nav('/kocluk')}><ArrowLeft size={17}/>Koç Masası</button><button className="primary-btn" type="button" onClick={() => setNewExam(true)} disabled={!activeProfiles.length}><Plus size={17}/>Sonuç Ekle</button></div>
    </section>

    <section className="kpi-grid four">
      <div className="kpi-card blue"><div className="kpi-icon"><ClipboardCheck/></div><span>Onaylı Deneme</span><strong>{views.length}</strong><small>tek doğrulanmış veri kaynağı</small></div>
      <div className="kpi-card teal"><div className="kpi-icon"><Target/></div><span>Son 30 Gün</span><strong>{recentCount}</strong><small>yakın dönem sonucu</small></div>
      <div className="kpi-card red"><div className="kpi-icon"><TrendingDown/></div><span>Dikkat Sinyali</span><strong>{attentionCount}</strong><small>açıklanabilir gerileme</small></div>
      <div className="kpi-card green"><div className="kpi-icon"><TrendingUp/></div><span>Olumlu Gelişim</span><strong>{growthCount}</strong><small>belirgin net artışı</small></div>
    </section>

    <section>
      <div className="section-heading"><div><h2>Deneme Sinyalleri</h2><span>Grafik kalabalığı yerine koçun karar vermesi gereken değişimler</span></div></div>
      {loading ? <div className="calm-empty"><Sparkles/><b>Deneme verileri analiz ediliyor…</b></div> : error ? <div className="calm-empty"><AlertTriangle/><b>Deneme verileri açılamadı.</b><span>{error}</span><button className="secondary-btn" onClick={() => void refresh()}>Tekrar Dene</button></div> : signals.length ? <div className="exam-signal-grid">
        {signals.slice(0, 8).map(signal => <button key={signal.key} className={`exam-signal-card ${signal.tone}`} onClick={() => setSelectedId(signal.examId)}>
          <span className="exam-signal-icon">{signal.tone === 'down' ? <TrendingDown/> : signal.tone === 'up' ? <TrendingUp/> : <Minus/>}</span>
          <span><small>{studentName(data, signal.studentId)}</small><b>{signal.title}</b><em>{signal.detail}</em></span>
        </button>)}
      </div> : <div className="all-good"><Sparkles/><span><b>{views.length ? 'Şu anda aksiyon gerektiren belirgin deneme değişimi yok.' : 'İlk gerçek deneme sonucu bekleniyor.'}</b><small>{views.length ? 'Yeni sonuç geldiğinde önceki denemeyle otomatik karşılaştırılacak.' : 'Sahte veri üretmeden gerçek sonuçla analiz zinciri başlayacak.'}</small></span>{!views.length && activeProfiles.length > 0 && <button className="secondary-btn" type="button" onClick={() => setNewExam(true)}>İlk Sonucu Ekle</button>}</div>}
    </section>

    <section>
      <div className="section-heading"><div><h2>Son Denemeler</h2><span>Öğrenci bazında doğrulanmış sonuç geçmişi</span></div><button className="text-btn" type="button" onClick={() => setNewExam(true)} disabled={!activeProfiles.length}>Yeni Sonuç</button></div>
      {views.length ? <div className="exam-history-grid">
        {views.slice(0, 12).map(view => {
          const previous = previousFor(view)
          const delta = previous ? Number((view.totalNet - previous.totalNet).toFixed(2)) : null
          return <button className="exam-history-card" key={view.exam.deneme_id} onClick={() => setSelectedId(view.exam.deneme_id)}>
            <div className="exam-history-top"><span><small>{studentName(data, view.exam.ogrenci_id)} · {view.exam.sinav_turu}</small><b>{view.exam.deneme_adi}</b><em>{view.exam.yayinevi || 'Yayın belirtilmedi'} · {shortDate(view.exam.deneme_tarihi)}</em></span><strong>{fmtNet(view.totalNet)}<small>net</small></strong></div>
            <div className="exam-history-bottom"><span>{view.sections.length} ders/bölüm</span>{delta === null ? <span className="neutral">İlk karşılaştırma sonucu</span> : delta > 0 ? <span className="up"><TrendingUp size={15}/>+{fmtNet(delta)}</span> : delta < 0 ? <span className="down"><TrendingDown size={15}/>{fmtNet(delta)}</span> : <span className="neutral"><Minus size={15}/>Değişmedi</span>}</div>
          </button>
        })}
      </div> : !loading && !error ? <div className="calm-empty"><ClipboardCheck/><b>Henüz gerçek deneme sonucu yok.</b><span>İlk sonuç kaydedildiğinde Deneme Merkezi otomatik trend ve ders değişimlerini üretmeye başlayacak.</span>{activeProfiles.length ? <button className="primary-btn" type="button" onClick={() => setNewExam(true)}>İlk Sonucu Ekle</button> : <button className="secondary-btn" type="button" onClick={() => nav('/kocluk')}>Önce Koçluk Öğrencisi Tanımla</button>}</div> : null}
    </section>

    <Sheet open={newExam} title="Deneme Sonucu Ekle" subtitle="Doğru ve yanlışı girin; boş, net ve toplamlar sistem tarafından hesaplanır." onClose={() => setNewExam(false)}>
      <ExamResultForm profiles={profiles} onCancel={() => setNewExam(false)} onDone={async () => { setNewExam(false); await refresh(); toast('Deneme Merkezi güncellendi.') }}/>
    </Sheet>

    <Sheet open={!!selected} title={selected?.exam.deneme_adi || 'Deneme Sonucu'} subtitle={selected ? `${studentName(data, selected.exam.ogrenci_id)} · ${selected.exam.sinav_turu} · ${fullDate(selected.exam.deneme_tarihi)}` : ''} onClose={() => setSelectedId(null)}>
      {selected && <div className="detail-stack exam-detail">
        <section className="exam-detail-hero"><div><span>TOPLAM NET</span><strong>{fmtNet(selected.totalNet)}</strong><small>{selected.exam.yayinevi || 'Yayın belirtilmedi'}</small></div><div>{selectedDelta === null ? <span className="soft-pill">İlk sonuç</span> : selectedDelta > 0 ? <span className="soft-pill exam-up">+{fmtNet(selectedDelta)} net</span> : selectedDelta < 0 ? <span className="soft-pill exam-down">{fmtNet(selectedDelta)} net</span> : <span className="soft-pill">Değişmedi</span>}</div></section>
        {selectedPrevious && <div className="form-hint">Karşılaştırma: {selectedPrevious.exam.deneme_adi} ({fmtNet(selectedPrevious.totalNet)} net) → {selected.exam.deneme_adi} ({fmtNet(selected.totalNet)} net).</div>}
        <section className="exam-detail-sections"><div className="exam-detail-row head"><span>Ders</span><span>D</span><span>Y</span><span>B</span><span>Net</span></div>{selected.sections.map(section => <div className="exam-detail-row" key={section.sonuc_id}><b>{section.bolum_adi}</b><span>{section.dogru}</span><span>{section.yanlis}</span><span>{section.bos}</span><strong>{fmtNet(Number(section.net))}</strong></div>)}</section>
        {(selected.exam.puan != null || selected.exam.siralama != null || selected.exam.yuzdelik != null) && <div className="mini-grid three"><div><span>Puan</span><b>{selected.exam.puan ?? '—'}</b></div><div><span>Sıralama</span><b>{selected.exam.siralama?.toLocaleString('tr-TR') || '—'}</b></div><div><span>Yüzdelik</span><b>{selected.exam.yuzdelik != null ? `%${selected.exam.yuzdelik}` : '—'}</b></div></div>}
        {selected.exam.notlar && <div className="note-box">Koç notu: {selected.exam.notlar}</div>}
        <div className="form-hint">Bir sonraki premium adımda bu sonuçtan doğrudan “Çalışma Ekle” ve “Görüşme Gündemine Ekle” aksiyonları üretilecek.</div>
      </div>}
    </Sheet>
  </div>
}
