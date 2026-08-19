import { AlertTriangle, BookOpenCheck, ChevronRight, Target, UserPlus, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { CoachingProfileForm } from '../components/CoachingProfileForm'
import { Sheet } from '../components/Sheet'
import { loadCoachingProfiles, type KoclukOgrenciProfili } from '../services/coachingService'
import { activeStudents, overdueAssignments, studentName, teacherName } from '../services/metrics'

export function CoachingPage() {
  const { data } = useAppData()
  const nav = useNavigate()
  const [profiles, setProfiles] = useState<KoclukOgrenciProfili[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [newProfile, setNewProfile] = useState(false)
  const [editing, setEditing] = useState<KoclukOgrenciProfili | null>(null)

  const refreshProfiles = useCallback(async () => {
    setProfilesLoading(true)
    try {
      setProfiles(await loadCoachingProfiles())
      setProfilesError(null)
    } catch (err: any) {
      setProfilesError(err?.message || String(err))
    } finally {
      setProfilesLoading(false)
    }
  }, [])

  useEffect(() => { void refreshProfiles() }, [refreshProfiles])

  const summary = useMemo(() => {
    if (!data) return null
    const active = activeStudents(data)
    const coachingProfiles = profiles.filter(x => x.durum === 'Aktif')
    const coachingIds = new Set(coachingProfiles.map(x => x.ogrenci_id))
    const overdue = overdueAssignments(data).filter(x => coachingIds.has(x.ogrenci_id))
    const openAssignments = data.odevler.filter(x => coachingIds.has(x.ogrenci_id) && !['Tamamlandı', 'Teslim Edildi', 'İptal'].includes(x.durum))
    const overdueByStudent = new Map<string, number>()
    for (const item of overdue) overdueByStudent.set(item.ogrenci_id, (overdueByStudent.get(item.ogrenci_id) || 0) + 1)
    const attention = [...overdueByStudent.entries()]
      .map(([ogrenci_id, count]) => ({ ogrenci_id, count, name: studentName(data, ogrenci_id) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr-TR'))
    const unassigned = coachingProfiles.filter(x => !x.koc_ogretmen_id).length

    return { active, coachingProfiles, overdue, openAssignments, attention, unassigned }
  }, [data, profiles])

  if (!data || !summary) return null

  return <div className="page-stack coaching-v1">
    <section className="page-title-row">
      <div><span className="eyebrow">KOÇLUK MODÜLÜ</span><h1>Koç Masası</h1></div>
      <button className="primary-btn" onClick={() => setNewProfile(true)}><UserPlus size={17}/>Koçluk Öğrencisi Ekle</button>
    </section>

    <section className="kpi-grid four">
      <button className="kpi-card teal" onClick={() => nav('/ogrenciler')}>
        <div className="kpi-icon"><UsersRound/></div><span>Aktif Öğrenci</span><strong>{summary.active.length}</strong><small>BS Eğitim toplamı</small>
      </button>
      <div className="kpi-card blue">
        <div className="kpi-icon"><Target/></div><span>Koçluk Öğrencisi</span><strong>{summary.coachingProfiles.length}</strong><small>aktif koçluk profili</small>
      </div>
      <div className="kpi-card orange">
        <div className="kpi-icon"><UsersRound/></div><span>Koç Atanmamış</span><strong>{summary.unassigned}</strong><small>atama bekleyen öğrenci</small>
      </div>
      <button className="kpi-card red" onClick={() => nav('/odevler')}>
        <div className="kpi-icon"><AlertTriangle/></div><span>Geciken Çalışma</span><strong>{summary.overdue.length}</strong><small>koçluk öğrencilerinde</small>
      </button>
    </section>

    <section>
      <div className="section-heading"><div><h2>Koçluk Öğrencileri</h2><span>hedef ve koç atamaları</span></div><button className="text-btn" onClick={() => setNewProfile(true)}>Yeni Profil</button></div>
      {profilesLoading ? <div className="calm-empty"><Target/><b>Koçluk profilleri yükleniyor…</b></div> : profilesError ? <div className="calm-empty"><AlertTriangle/><b>Koçluk profilleri açılamadı.</b><span>{profilesError}</span></div> : summary.coachingProfiles.length ? <div className="student-grid">
        {summary.coachingProfiles.map(profile => {
          const student = data.ogrenciler.find(x => x.ogrenci_id === profile.ogrenci_id)
          const target = [profile.hedef_okul, profile.hedef_bolum].filter(Boolean).join(' · ') || 'Hedef henüz girilmedi'
          return <button key={profile.ogrenci_id} className="student-card student-outline-card" onClick={() => setEditing(profile)}>
            <div className="student-top">
              <div className="avatar student-list-avatar">{(student?.ad_soyad || '?').split(/\s+/).slice(0,2).map(x => x[0]).join('').toLocaleUpperCase('tr-TR')}</div>
              <div className="student-name"><strong>{student?.ad_soyad || 'Öğrenci'}</strong><span>{profile.sinav_turu || 'Sınav türü belirtilmedi'}</span></div>
              <span className="soft-pill">{profile.durum}</span>
            </div>
            <div className="student-meta"><span><b>{profile.koc_ogretmen_id ? teacherName(data, profile.koc_ogretmen_id) : 'Atanmadı'}</b> koç</span><span>{profile.baslangic_tarihi} başlangıç</span></div>
            <div className="student-balance"><span>Hedef</span><b>{target}</b></div>
          </button>
        })}
      </div> : <div className="calm-empty"><Target/><b>Henüz koçluk öğrencisi tanımlanmadı.</b><span>İlk öğrenciyi “Koçluk Öğrencisi Ekle” ile tanımlayın.</span></div>}
    </section>

    <section>
      <div className="section-heading"><div><h2>Öncelikli Öğrenciler</h2><span>koçluk öğrencilerinin mevcut görevlerine göre</span></div></div>
      {summary.attention.length ? <div className="attention-grid">
        {summary.attention.slice(0, 8).map(item => <button key={item.ogrenci_id} onClick={() => nav('/odevler')}>
          <span className="attention-icon"><AlertTriangle/></span>
          <span><b>{item.name}</b><small>{item.count} geciken çalışma</small></span>
          <ChevronRight size={17}/>
        </button>)}
      </div> : <div className="all-good"><Target/><span><b>Şu anda takip bekleyen gecikmiş çalışma yok.</b><small>Görüşme ve deneme sinyalleri sonraki aşamada bu alana eklenecek.</small></span></div>}
    </section>

    <section>
      <div className="section-heading"><div><h2>Koçluk Çekirdeği</h2><span>V1 geliştirme sırası</span></div></div>
      <div className="quick-actions">
        <button type="button" onClick={() => setNewProfile(true)}><span className="quick-icon teal"><Target/></span><b>Öğrenci Hedefi</b><small>hedef okul / bölüm / sınav</small></button>
        <button type="button" disabled><span className="quick-icon blue"><BookOpenCheck/></span><b>Haftalık Plan</b><small>sıradaki geliştirme</small></button>
        <button type="button" disabled><span className="quick-icon orange"><UsersRound/></span><b>Koçluk Görüşmesi</b><small>sonraki aşama</small></button>
        <button type="button" disabled><span className="quick-icon green"><Target/></span><b>Deneme Merkezi</b><small>sonraki aşama</small></button>
      </div>
    </section>

    <Sheet open={newProfile || !!editing} title={editing ? studentName(data, editing.ogrenci_id) : 'Koçluk Öğrencisi Ekle'} subtitle={editing ? 'Koçluk hedefi ve koç ataması' : 'Öğrenciyi koçluk takibine alın.'} onClose={() => { setNewProfile(false); setEditing(null) }}>
      <CoachingProfileForm
        profile={editing}
        onCancel={() => { setNewProfile(false); setEditing(null) }}
        onDone={async () => { await refreshProfiles(); setNewProfile(false); setEditing(null) }}
      />
    </Sheet>
  </div>
}
