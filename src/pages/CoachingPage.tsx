import { AlertTriangle, BookOpenCheck, ChevronRight, Target, UsersRound } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { activeStudents, overdueAssignments, studentName } from '../services/metrics'

export function CoachingPage() {
  const { data } = useAppData()
  const nav = useNavigate()

  const summary = useMemo(() => {
    if (!data) return null
    const active = activeStudents(data)
    const overdue = overdueAssignments(data)
    const openAssignments = data.odevler.filter(x => !['Tamamlandı', 'Teslim Edildi'].includes(x.durum))
    const overdueByStudent = new Map<string, number>()
    for (const item of overdue) overdueByStudent.set(item.ogrenci_id, (overdueByStudent.get(item.ogrenci_id) || 0) + 1)
    const attention = [...overdueByStudent.entries()]
      .map(([ogrenci_id, count]) => ({ ogrenci_id, count, name: studentName(data, ogrenci_id) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr-TR'))

    return { active, overdue, openAssignments, attention }
  }, [data])

  if (!data || !summary) return null

  return <div className="page-stack coaching-v1">
    <section className="page-title-row">
      <div><span className="eyebrow">KOÇLUK MODÜLÜ</span><h1>Koç Masası</h1></div>
    </section>

    <section className="kpi-grid four">
      <button className="kpi-card teal" onClick={() => nav('/ogrenciler')}>
        <div className="kpi-icon"><UsersRound/></div><span>Aktif Öğrenci</span><strong>{summary.active.length}</strong><small>mevcut BS Eğitim kayıtları</small>
      </button>
      <button className="kpi-card blue" onClick={() => nav('/odevler')}>
        <div className="kpi-icon"><BookOpenCheck/></div><span>Açık Çalışma</span><strong>{summary.openAssignments.length}</strong><small>tamamlanmayı bekleyen görev</small>
      </button>
      <button className="kpi-card orange" onClick={() => nav('/odevler')}>
        <div className="kpi-icon"><AlertTriangle/></div><span>Geciken Çalışma</span><strong>{summary.overdue.length}</strong><small>son teslim tarihi geçmiş</small>
      </button>
      <button className="kpi-card red" onClick={() => nav('/odevler')}>
        <div className="kpi-icon"><Target/></div><span>Takip Gereken</span><strong>{summary.attention.length}</strong><small>geciken görevi olan öğrenci</small>
      </button>
    </section>

    <section>
      <div className="section-heading"><div><h2>Öncelikli Öğrenciler</h2><span>mevcut görev verilerine göre</span></div></div>
      {summary.attention.length ? <div className="attention-grid">
        {summary.attention.slice(0, 8).map(item => <button key={item.ogrenci_id} onClick={() => nav('/odevler')}>
          <span className="attention-icon"><AlertTriangle/></span>
          <span><b>{item.name}</b><small>{item.count} geciken çalışma</small></span>
          <ChevronRight size={17}/>
        </button>)}
      </div> : <div className="all-good"><Target/><span><b>Şu anda geciken çalışma görünmüyor.</b><small>Koçluk hedefi, görüşme ve deneme verileri sonraki adımlarda bu masaya eklenecek.</small></span></div>}
    </section>

    <section>
      <div className="section-heading"><div><h2>Koçluk Çekirdeği</h2><span>V1 geliştirme sırası</span></div></div>
      <div className="quick-actions">
        <button type="button"><span className="quick-icon teal"><Target/></span><b>Öğrenci Hedefi</b><small>hedef okul / bölüm / sınav</small></button>
        <button type="button"><span className="quick-icon blue"><BookOpenCheck/></span><b>Haftalık Plan</b><small>çalışma ve görev takibi</small></button>
        <button type="button"><span className="quick-icon orange"><UsersRound/></span><b>Koçluk Görüşmesi</b><small>notlar ve alınan kararlar</small></button>
        <button type="button"><span className="quick-icon green"><Target/></span><b>Deneme Merkezi</b><small>TYT · AYT · LGS analizi</small></button>
      </div>
    </section>
  </div>
}
