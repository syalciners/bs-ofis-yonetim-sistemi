import { AlertTriangle, BookOpenCheck, CalendarDays, ChevronRight, MessageSquareText, Target, UserPlus, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../components/AppDataProvider'
import { CoachingMeetingForm } from '../components/CoachingMeetingForm'
import { CoachingProfileForm } from '../components/CoachingProfileForm'
import { CoachingStudyForm } from '../components/CoachingStudyForm'
import { StudentBookForm } from '../components/StudentBookForm'
import { Sheet } from '../components/Sheet'
import { addDays, compactWeekRange, mondayOf, shortDate, time, todayISO } from '../lib/format'
import { loadCoachingMeetings, loadCoachingProfiles, type KoclukGorusmesi, type KoclukOgrenciProfili } from '../services/coachingService'
import { activeStudents, overdueAssignments, studentName, teacherName } from '../services/metrics'

export function CoachingPage() {
  const { data } = useAppData()
  const nav = useNavigate()
  const [profiles, setProfiles] = useState<KoclukOgrenciProfili[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [meetings, setMeetings] = useState<KoclukGorusmesi[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(true)
  const [meetingsError, setMeetingsError] = useState<string | null>(null)
  const [newProfile, setNewProfile] = useState(false)
  const [editing, setEditing] = useState<KoclukOgrenciProfili | null>(null)
  const [newMeeting, setNewMeeting] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<KoclukGorusmesi | null>(null)
  const [newBook, setNewBook] = useState(false)
  const [newStudy, setNewStudy] = useState(false)

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

  const refreshMeetings = useCallback(async () => {
    setMeetingsLoading(true)
    try {
      setMeetings(await loadCoachingMeetings())
      setMeetingsError(null)
    } catch (err: any) {
      setMeetingsError(err?.message || String(err))
    } finally {
      setMeetingsLoading(false)
    }
  }, [])

  useEffect(() => { void refreshProfiles(); void refreshMeetings() }, [refreshProfiles, refreshMeetings])

  const summary = useMemo(() => {
    if (!data) return null
    const active = activeStudents(data)
    const coachingProfiles = profiles.filter(x => x.durum === 'Aktif')
    const coachingIds = new Set(coachingProfiles.map(x => x.ogrenci_id))
    const overdue = overdueAssignments(data).filter(x => coachingIds.has(x.ogrenci_id) && x.durum !== 'İptal')
    const openAssignments = data.odevler.filter(x => coachingIds.has(x.ogrenci_id) && !['Tamamlandı', 'Teslim Edildi', 'İptal'].includes(x.durum))
    const overdueByStudent = new Map<string, number>()
    for (const item of overdue) overdueByStudent.set(item.ogrenci_id, (overdueByStudent.get(item.ogrenci_id) || 0) + 1)
    const attention = [...overdueByStudent.entries()]
      .map(([ogrenci_id, count]) => ({ ogrenci_id, count, name: studentName(data, ogrenci_id) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr-TR'))
    const unassigned = coachingProfiles.filter(x => !x.koc_ogretmen_id).length
    const today = todayISO()
    const todayMeetings = meetings.filter(x => x.gorusme_tarihi === today && x.durum !== 'İptal')
    const upcomingMeetings = meetings
      .filter(x => x.gorusme_tarihi >= today && ['Planlandı', 'Ertelendi'].includes(x.durum))
      .sort((a, b) => `${a.gorusme_tarihi} ${a.baslangic_saati || ''}`.localeCompare(`${b.gorusme_tarihi} ${b.baslangic_saati || ''}`))
    const weekStart = mondayOf(today)
    const weekEnd = addDays(weekStart, 6)
    const weeklyAssignments = data.odevler
      .filter(x => {
        if (!coachingIds.has(x.ogrenci_id) || x.durum === 'İptal') return false
        const start = x.verilis_tarihi || x.son_teslim_tarihi
        const end = x.son_teslim_tarihi || x.verilis_tarihi
        return Boolean(start && end && start <= weekEnd && end >= weekStart)
      })
      .sort((a, b) => String(a.son_teslim_tarihi || a.verilis_tarihi || '9999').localeCompare(String(b.son_teslim_tarihi || b.verilis_tarihi || '9999')))
    const weeklyDone = weeklyAssignments.filter(x => ['Tamamlandı', 'Teslim Edildi'].includes(x.durum)).length

    return { active, coachingProfiles, overdue, openAssignments, attention, unassigned, todayMeetings, upcomingMeetings, weekStart, weekEnd, weeklyAssignments, weeklyDone }
  }, [data, profiles, meetings])

  if (!data || !summary) return null

  return <div className="page-stack coaching-v1">
    <section className="page-title-row">
      <div><span className="eyebrow">KOÇLUK MODÜLÜ</span><h1>Koç Masası</h1></div>
      <button className="primary-btn" onClick={() => setNewMeeting(true)}><MessageSquareText size={17}/>Görüşme Ekle</button>
    </section>

    <section className="kpi-grid four">
      <button className="kpi-card teal" onClick={() => nav('/ogrenciler')}>
        <div className="kpi-icon"><UsersRound/></div><span>Koçluk Öğrencisi</span><strong>{summary.coachingProfiles.length}</strong><small>aktif takipte</small>
      </button>
      <div className="kpi-card blue">
        <div className="kpi-icon"><CalendarDays/></div><span>Bugünkü Görüşme</span><strong>{summary.todayMeetings.length}</strong><small>bugün planlanan</small>
      </div>
      <div className="kpi-card orange">
        <div className="kpi-icon"><UsersRound/></div><span>Koç Atanmamış</span><strong>{summary.unassigned}</strong><small>atama bekleyen öğrenci</small>
      </div>
      <button className="kpi-card red" onClick={() => nav('/odevler')}>
        <div className="kpi-icon"><AlertTriangle/></div><span>Geciken Çalışma</span><strong>{summary.overdue.length}</strong><small>koçluk öğrencilerinde</small>
      </button>
    </section>

    <section>
      <div className="section-heading">
        <div><h2>Bu Haftanın Planı</h2><span>{compactWeekRange(summary.weekStart, summary.weekEnd)} · koçluk öğrencilerinin çalışma akışı</span></div>
        <div className="form-actions"><button className="text-btn" type="button" onClick={() => setNewBook(true)}>Kitap Ekle</button><button className="text-btn" type="button" onClick={() => setNewStudy(true)}>Çalışma Ekle</button></div>
      </div>
      {summary.weeklyAssignments.length ? <div className="student-grid">
        {summary.weeklyAssignments.slice(0, 8).map(item => {
          const done = ['Tamamlandı', 'Teslim Edildi'].includes(item.durum)
          const due = item.son_teslim_tarihi || item.verilis_tarihi
          return <button key={item.odev_id} className="student-card student-outline-card" onClick={() => nav('/odevler')}>
            <div className="student-top">
              <div className="avatar student-list-avatar"><BookOpenCheck size={18}/></div>
              <div className="student-name"><strong>{item.odev_basligi || item.konu || 'Çalışma'}</strong><span>{studentName(data, item.ogrenci_id)}</span></div>
              <span className="soft-pill">{done ? 'Tamamlandı' : item.durum}</span>
            </div>
            <div className="student-meta"><span><b>{teacherName(data, item.ogretmen_id)}</b> tarafından</span><span>{item.oncelik || 'Normal'} öncelik</span></div>
            <div className="student-balance"><span>{done ? 'Tamamlanma' : 'Son Tarih'}</span><b>{due ? shortDate(due) : 'Tarih yok'}</b></div>
          </button>
        })}
      </div> : <div className="calm-empty"><BookOpenCheck/><b>Bu hafta için çalışma planı henüz boş.</b><span>Öğrencinin kitabını bir kez tanımlayın; sonra sadece kitap ve sayfa/test aralığı seçilir.</span><button className="secondary-btn" type="button" onClick={() => setNewStudy(true)}>İlk Çalışmayı Ekle</button></div>}
      {summary.weeklyAssignments.length > 0 && <div className="form-hint">Bu hafta {summary.weeklyDone}/{summary.weeklyAssignments.length} çalışma tamamlandı. Kitaplı çalışmalar da mevcut Ödevler altyapısında izlenir.</div>}
    </section>

    <section>
      <div className="section-heading"><div><h2>Yaklaşan Görüşmeler</h2><span>koçluk takvimindeki sıradaki görüşmeler</span></div><button className="text-btn" onClick={() => setNewMeeting(true)}>Yeni Görüşme</button></div>
      {meetingsLoading ? <div className="calm-empty"><CalendarDays/><b>Görüşmeler yükleniyor…</b></div> : meetingsError ? <div className="calm-empty"><AlertTriangle/><b>Görüşmeler açılamadı.</b><span>{meetingsError}</span></div> : summary.upcomingMeetings.length ? <div className="student-grid">
        {summary.upcomingMeetings.slice(0, 8).map(meeting => <button key={meeting.gorusme_id} className="student-card student-outline-card" onClick={() => setEditingMeeting(meeting)}>
          <div className="student-top">
            <div className="avatar student-list-avatar"><MessageSquareText size={18}/></div>
            <div className="student-name"><strong>{studentName(data, meeting.ogrenci_id)}</strong><span>{meeting.gundem || 'Gündem henüz girilmedi'}</span></div>
            <span className="soft-pill">{meeting.durum}</span>
          </div>
          <div className="student-meta"><span><b>{teacherName(data, meeting.koc_ogretmen_id)}</b> koç</span><span>{meeting.gorusme_turu || 'Görüşme'}</span></div>
          <div className="student-balance"><span>Tarih</span><b>{shortDate(meeting.gorusme_tarihi)} · {time(meeting.baslangic_saati)}</b></div>
        </button>)}
      </div> : <div className="calm-empty"><CalendarDays/><b>Planlanmış koçluk görüşmesi yok.</b><span>İlk görüşmeyi “Görüşme Ekle” ile planlayabilirsiniz.</span></div>}
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
      </div> : <div className="calm-empty"><Target/><b>Henüz koçluk öğrencisi tanımlanmadı.</b><span>İlk öğrenciyi “Yeni Profil” ile tanımlayın.</span></div>}
    </section>

    <section>
      <div className="section-heading"><div><h2>Öncelikli Öğrenciler</h2><span>koçluk öğrencilerinin mevcut görevlerine göre</span></div></div>
      {summary.attention.length ? <div className="attention-grid">
        {summary.attention.slice(0, 8).map(item => <button key={item.ogrenci_id} onClick={() => nav('/odevler')}>
          <span className="attention-icon"><AlertTriangle/></span>
          <span><b>{item.name}</b><small>{item.count} geciken çalışma</small></span>
          <ChevronRight size={17}/>
        </button>)}
      </div> : <div className="all-good"><Target/><span><b>Şu anda takip bekleyen gecikmiş çalışma yok.</b><small>Deneme ve gelişim sinyalleri ilerleyen adımlarda bu alana eklenecek.</small></span></div>}
    </section>

    <section>
      <div className="section-heading"><div><h2>Koçluk Çekirdeği</h2><span>koçun tekrar veri yazmasını azaltan kısa yollar</span></div></div>
      <div className="quick-actions">
        <button type="button" onClick={() => setNewProfile(true)}><span className="quick-icon teal"><Target/></span><b>Öğrenci Hedefi</b><small>hedef okul / bölüm / sınav</small></button>
        <button type="button" onClick={() => setNewBook(true)}><span className="quick-icon blue"><BookOpenCheck/></span><b>Kitaplar</b><small>katalogdan ara · öğrenciye bir kez ekle</small></button>
        <button type="button" onClick={() => setNewMeeting(true)}><span className="quick-icon orange"><MessageSquareText/></span><b>Koçluk Görüşmesi</b><small>planla · not al · kararları kaydet</small></button>
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

    <Sheet open={newMeeting || !!editingMeeting} title={editingMeeting ? studentName(data, editingMeeting.ogrenci_id) : 'Koçluk Görüşmesi Ekle'} subtitle={editingMeeting ? 'Görüşme notları, kararlar ve sonraki takip' : 'Koçluk görüşmesini planlayın.'} onClose={() => { setNewMeeting(false); setEditingMeeting(null) }}>
      <CoachingMeetingForm
        meeting={editingMeeting}
        profiles={profiles}
        onCancel={() => { setNewMeeting(false); setEditingMeeting(null) }}
        onDone={async () => { await refreshMeetings(); setNewMeeting(false); setEditingMeeting(null) }}
      />
    </Sheet>

    <Sheet open={newBook} title="Öğrenci Kitapları" subtitle="Kitabı katalogdan arayın; yalnızca bir kez öğrenciye ekleyin." onClose={() => setNewBook(false)}>
      <StudentBookForm profiles={profiles} onCancel={() => setNewBook(false)} onDone={() => setNewBook(false)}/>
    </Sheet>

    <Sheet open={newStudy} title="Hızlı Çalışma Ekle" subtitle="Öğrencinin kitabını seçin; koç yalnızca sayfa, test veya konuyu belirlesin." onClose={() => setNewStudy(false)}>
      <CoachingStudyForm
        profiles={profiles}
        onNeedBook={() => { setNewStudy(false); setNewBook(true) }}
        onCancel={() => setNewStudy(false)}
        onDone={() => setNewStudy(false)}
      />
    </Sheet>
  </div>
}
