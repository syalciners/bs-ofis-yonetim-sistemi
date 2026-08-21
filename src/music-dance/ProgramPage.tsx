import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Layers3, LoaderCircle, MapPin, Plus, Sparkles, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { t } from '../lib/productProfile'
import { useMusicDanceData } from './MusicDanceDataProvider'
import {
  mdDersDurumuGuncelle,
  mdHaftaDersleriniGetir,
  mdHaftayiOlustur,
  mdKatilimDurumuGuncelle,
  mdProgramDurumuGuncelle,
  mdProgramEkle,
} from './service'
import type { MdDers, MdDersDurumu, MdHaftaUretimSonucu, MdHaftaVerisi, MdKatilimDurumu, MdProgramTuru } from './types'
import './program-art.css'

const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const KATILIM_DURUMLARI: MdKatilimDurumu[] = ['Katıldı', 'Gelmedi', 'Mazeretli', 'Planlandı']
const DERS_DURUMLARI: MdDersDurumu[] = ['Planlandı', 'Yapıldı', 'İptal', 'Ertelendi', 'Eğitmen İptali']

function localIso(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseIso(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(value: string, amount: number) {
  const date = parseIso(value)
  date.setDate(date.getDate() + amount)
  return localIso(date)
}

function mondayOf(value = new Date()) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return localIso(date)
}

function shortDate(value: string) {
  return parseIso(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

function longWeek(start: string) {
  const end = addDays(start, 6)
  const a = parseIso(start)
  const b = parseIso(end)
  const sameMonth = a.getMonth() === b.getMonth()
  return sameMonth
    ? `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`
    : `${a.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function timeShort(value: string) { return value.slice(0, 5) }
function statusClass(value: string) { return value.toLocaleLowerCase('tr-TR').replaceAll(' ', '-').replaceAll('ı', 'i').replaceAll('ğ', 'g').replaceAll('ş', 's').replaceAll('ç', 'c').replaceAll('ö', 'o').replaceAll('ü', 'u') }

function ProgramModal({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return <div className="md-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="md-modal md-program-modal" role="dialog" aria-modal="true">
      <header><div><span>BS · PROGRAM</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Kapat"><X size={18}/></button></header>
      <div className="md-modal-body">{children}</div>
    </section>
  </div>
}

export function ProgramPage() {
  const { data, aktifKurum, refresh } = useMusicDanceData()
  const [weekStart, setWeekStart] = useState(() => mondayOf())
  const [week, setWeek] = useState<MdHaftaVerisi>({ dersler: [], katilimlar: [] })
  const [loadingWeek, setLoadingWeek] = useState(false)
  const [programOpen, setProgramOpen] = useState(false)
  const [programType, setProgramType] = useState<MdProgramTuru>('Bireysel')
  const [sourceId, setSourceId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [duration, setDuration] = useState(60)
  const [busy, setBusy] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [result, setResult] = useState<MdHaftaUretimSonucu | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const weekEnd = addDays(weekStart, 6)

  const loadWeek = useCallback(async () => {
    if (!aktifKurum) return
    setLoadingWeek(true)
    try {
      setWeek(await mdHaftaDersleriniGetir(aktifKurum.kurum_id, weekStart, weekEnd))
      setLocalError(null)
    } catch (e: any) {
      setLocalError(e?.message || String(e))
    } finally {
      setLoadingWeek(false)
    }
  }, [aktifKurum?.kurum_id, weekStart, weekEnd])

  useEffect(() => { void loadWeek() }, [loadWeek])

  useEffect(() => {
    if (!data) return
    if (programType !== 'Grup' || !sourceId) return
    const group = data.gruplar.find(x => x.grup_id === sourceId)
    if (!group) return
    setBranchId(group.brans_id || '')
    setTeacherId(group.varsayilan_egitmen_id || '')
    setRoomId(group.varsayilan_mekan_id || '')
    const branch = data.branslar.find(x => x.brans_id === group.brans_id)
    if (branch?.varsayilan_sure_dk) setDuration(branch.varsayilan_sure_dk)
  }, [data, programType, sourceId])

  const activePrograms = useMemo(() => data?.programlar.filter(x => x.durum === 'Aktif') || [], [data])
  const selectedLesson = week.dersler.find(x => x.ders_id === selectedLessonId) || null
  const selectedAttendances = selectedLesson ? week.katilimlar.filter(x => x.ders_id === selectedLesson.ders_id) : []

  if (!data || !aktifKurum) return null

  const sourceName = (program: { program_turu: MdProgramTuru; kursiyer_id?: string | null; grup_id?: string | null }) => program.program_turu === 'Grup'
    ? data.gruplar.find(x => x.grup_id === program.grup_id)?.grup_adi || 'Grup'
    : data.kursiyerler.find(x => x.kursiyer_id === program.kursiyer_id)?.ad_soyad || t.student

  const lessonName = (lesson: MdDers) => {
    if (lesson.ders_turu === 'Grup') return data.gruplar.find(x => x.grup_id === lesson.grup_id)?.grup_adi || 'Grup Dersi'
    const attendance = week.katilimlar.find(x => x.ders_id === lesson.ders_id)
    return data.kursiyerler.find(x => x.kursiyer_id === attendance?.kursiyer_id)?.ad_soyad || 'Bireysel Ders'
  }

  const submitProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const source = String(form.get('source_id') || '')
    if (!source) return
    setBusy(true); setLocalError(null)
    try {
      await mdProgramEkle(aktifKurum.kurum_id, {
        program_turu: programType,
        kursiyer_id: programType === 'Bireysel' ? source : null,
        grup_id: programType === 'Grup' ? source : null,
        egitmen_id: String(form.get('egitmen_id')),
        brans_id: String(form.get('brans_id')),
        mekan_id: String(form.get('mekan_id') || '') || null,
        haftanin_gunu: Number(form.get('haftanin_gunu')),
        baslangic_saati: String(form.get('baslangic_saati')),
        sure_dk: Number(form.get('sure_dk')),
        baslangic_tarihi: String(form.get('baslangic_tarihi')),
        bitis_tarihi: String(form.get('bitis_tarihi') || '') || null,
        aciklama: String(form.get('aciklama') || '') || null,
      })
      await refresh()
      setProgramOpen(false)
      setSourceId(''); setBranchId(''); setTeacherId(''); setRoomId(''); setDuration(60)
    } catch (e: any) {
      setLocalError(e?.message || String(e))
    } finally { setBusy(false) }
  }

  const generateWeek = async () => {
    setBusy(true); setResult(null); setLocalError(null)
    try {
      const next = await mdHaftayiOlustur(weekStart)
      setResult(next)
      await loadWeek()
    } catch (e: any) { setLocalError(e?.message || String(e)) }
    finally { setBusy(false) }
  }

  const setLessonStatus = async (lessonId: string, status: MdDersDurumu) => {
    setBusyKey(`lesson-${lessonId}`)
    try { await mdDersDurumuGuncelle(lessonId, status); await loadWeek() }
    catch (e: any) { setLocalError(e?.message || String(e)) }
    finally { setBusyKey(null) }
  }

  const setAttendance = async (attendanceId: string, status: MdKatilimDurumu) => {
    setBusyKey(`attendance-${attendanceId}`)
    try { await mdKatilimDurumuGuncelle(attendanceId, status); await loadWeek() }
    catch (e: any) { setLocalError(e?.message || String(e)) }
    finally { setBusyKey(null) }
  }

  const deactivateProgram = async (programId: string) => {
    setBusyKey(`program-${programId}`)
    try { await mdProgramDurumuGuncelle(programId, 'Pasif'); await refresh() }
    catch (e: any) { setLocalError(e?.message || String(e)) }
    finally { setBusyKey(null) }
  }

  const programSources = programType === 'Grup'
    ? data.gruplar.filter(x => x.durum === 'Aktif')
    : data.kursiyerler.filter(x => x.durum === 'Aktif')

  const eligibleBranches = data.branslar.filter(x => x.aktif !== false && (programType === 'Grup' ? x.grup_uygun : x.bireysel_uygun))
  const eligibleTeachers = data.egitmenler.filter(x => x.durum === 'Aktif' && (!branchId || !data.egitmenBranslari.some(link => link.egitmen_id === x.egitmen_id && link.aktif !== false) || data.egitmenBranslari.some(link => link.egitmen_id === x.egitmen_id && link.brans_id === branchId && link.aktif !== false)))

  return <div className="md-page-stack md-program-page">
    <section className="md-page-head md-program-head">
      <div><span>PROGRAM · HAFTANIN RİTMİ</span><h1>Program</h1><p>Bireysel ve grup derslerini aynı akışta yönetin.</p></div>
      <div className="md-program-head-actions"><button className="md-secondary" onClick={() => { setProgramType('Bireysel'); setSourceId(''); setProgramOpen(true) }}><Plus/> Sabit Program</button><button className="md-primary" disabled={busy || !activePrograms.length} onClick={() => void generateWeek()}>{busy ? <LoaderCircle className="spin"/> : <Sparkles/>} Haftayı Hazırla</button></div>
    </section>

    {localError && <div className="md-program-alert error"><AlertTriangle/><span>{localError}</span><button onClick={() => setLocalError(null)}><X/></button></div>}
    {result && <div className={`md-program-alert ${result.hata ? 'warning' : 'success'}`}><span className="md-program-alert-icon">{result.hata ? <AlertTriangle/> : <Check/>}</span><div><strong>{result.hata ? 'Hafta hazırlandı, bazı çakışmalar var.' : 'Hafta hazır.'}</strong><span>{result.olusturulan} yeni ders · {result.mevcut} zaten hazır{result.hata ? ` · ${result.hata} çakışma` : ''}</span>{result.hatalar.slice(0, 3).map((x, i) => <small key={`${x.program_id}-${i}`}>{shortDate(x.tarih)} · {x.mesaj}</small>)}</div><button onClick={() => setResult(null)}><X/></button></div>}

    <section className="md-rhythm-toolbar">
      <button className="md-week-arrow" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Önceki hafta"><ChevronLeft/></button>
      <div className="md-week-title"><span>HAFTANIN RİTMİ</span><strong>{longWeek(weekStart)}</strong><small>{week.dersler.length} ders · {activePrograms.length} aktif sabit program</small></div>
      <button className="md-week-today" onClick={() => setWeekStart(mondayOf())}>Bu Hafta</button>
      <button className="md-week-arrow" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Sonraki hafta"><ChevronRight/></button>
    </section>

    <section className="md-week-board">
      {GUNLER.map((day, index) => {
        const date = addDays(weekStart, index)
        const lessons = week.dersler.filter(x => x.tarih === date)
        const isToday = date === localIso(new Date())
        return <article className={`md-day-lane ${isToday ? 'today' : ''}`} key={day}>
          <header><div><span>{day.slice(0, 3).toLocaleUpperCase('tr-TR')}</span><strong>{parseIso(date).getDate()}</strong></div><small>{lessons.length || '—'} ders</small></header>
          <div className="md-day-track">
            {lessons.map((lesson, lessonIndex) => {
              const branch = data.branslar.find(x => x.brans_id === lesson.brans_id)
              const teacher = data.egitmenler.find(x => x.egitmen_id === lesson.egitmen_id)
              const room = data.mekanlar.find(x => x.mekan_id === lesson.mekan_id)
              const participantCount = week.katilimlar.filter(x => x.ders_id === lesson.ders_id).length
              return <button type="button" className={`md-lesson-card ${lesson.ders_turu === 'Grup' ? 'group' : 'solo'} tone-${lessonIndex % 4 + 1}`} key={lesson.ders_id} onClick={() => setSelectedLessonId(lesson.ders_id)}>
                <div className="md-lesson-time"><Clock/><strong>{timeShort(lesson.baslangic_saati)}</strong><span>{lesson.sure_dk} dk</span></div>
                <strong className="md-lesson-name">{lessonName(lesson)}</strong>
                <span className="md-lesson-branch">{branch?.brans_adi || t.branch}</span>
                <div className="md-lesson-meta"><span>{lesson.ders_turu === 'Grup' ? <Layers3/> : <Users/>}{participantCount}</span>{room && <span><MapPin/>{room.mekan_adi}</span>}</div>
                <small>{teacher?.ad_soyad || t.teacher}</small>
                <em className={`md-status ${statusClass(lesson.ders_durumu)}`}>{lesson.ders_durumu}</em>
              </button>
            })}
            {!lessons.length && <div className="md-day-empty"><span/><small>{loadingWeek ? 'Yükleniyor…' : 'Boş akış'}</small></div>}
          </div>
        </article>
      })}
    </section>

    <section className="md-panel md-fixed-program-panel">
      <div className="md-panel-heading"><div><span>TEKRAR EDEN AKIŞ</span><h2>Sabit Programlar</h2></div><button onClick={() => setProgramOpen(true)}><Plus/> Yeni</button></div>
      {activePrograms.length ? <div className="md-fixed-program-grid">{activePrograms.map((program, index) => {
        const branch = data.branslar.find(x => x.brans_id === program.brans_id)
        const teacher = data.egitmenler.find(x => x.egitmen_id === program.egitmen_id)
        const room = data.mekanlar.find(x => x.mekan_id === program.mekan_id)
        return <article className={`md-fixed-card tone-${index % 4 + 1}`} key={program.program_id}>
          <div className="md-fixed-day"><span>{GUNLER[program.haftanin_gunu - 1]?.slice(0, 3)}</span><strong>{timeShort(program.baslangic_saati)}</strong></div>
          <div className="md-fixed-copy"><small>{program.program_turu} · {branch?.brans_adi || t.branch}</small><strong>{sourceName(program)}</strong><span>{teacher?.ad_soyad || t.teacher}{room ? ` · ${room.mekan_adi}` : ''}</span></div>
          <div className="md-fixed-duration"><b>{program.sure_dk}</b><small>dk</small></div>
          <button className="md-fixed-pause" disabled={busyKey === `program-${program.program_id}`} onClick={() => void deactivateProgram(program.program_id)}>Pasife Al</button>
        </article>
      })}</div> : <div className="md-program-zero"><CalendarDays/><div><strong>Henüz sabit program yok.</strong><span>İlk bireysel veya grup ders akışını tanımlayın; sonra haftayı tek dokunuşla hazırlayın.</span></div><button className="md-primary" onClick={() => setProgramOpen(true)}><Plus/> İlk Programı Ekle</button></div>}
    </section>

    <ProgramModal open={programOpen} title="Sabit Program Ekle" subtitle="Bireysel ve grup dersleri aynı takvim motorunda" onClose={() => setProgramOpen(false)}>
      <form className="md-form" onSubmit={submitProgram}>
        <div className="md-program-type-switch"><button type="button" className={programType === 'Bireysel' ? 'active' : ''} onClick={() => { setProgramType('Bireysel'); setSourceId(''); setBranchId(''); setTeacherId(''); setRoomId('') }}><Users/>Bireysel</button><button type="button" className={programType === 'Grup' ? 'active' : ''} onClick={() => { setProgramType('Grup'); setSourceId(''); setBranchId(''); setTeacherId(''); setRoomId('') }}><Layers3/>Grup</button></div>
        <label>{programType === 'Grup' ? 'Grup' : t.student}<select name="source_id" required value={sourceId} onChange={e => setSourceId(e.target.value)}><option value="">Seçin</option>{programSources.map((x: any) => <option key={programType === 'Grup' ? x.grup_id : x.kursiyer_id} value={programType === 'Grup' ? x.grup_id : x.kursiyer_id}>{programType === 'Grup' ? x.grup_adi : x.ad_soyad}</option>)}</select></label>
        <div className="md-form-two"><label>{t.branch}<select name="brans_id" required value={branchId} onChange={e => { const id = e.target.value; setBranchId(id); const b = data.branslar.find(x => x.brans_id === id); if (b?.varsayilan_sure_dk) setDuration(b.varsayilan_sure_dk) }}><option value="">Seçin</option>{eligibleBranches.map(x => <option key={x.brans_id} value={x.brans_id}>{x.brans_adi}</option>)}</select></label><label>{t.teacher}<select name="egitmen_id" required value={teacherId} onChange={e => setTeacherId(e.target.value)}><option value="">Seçin</option>{eligibleTeachers.map(x => <option key={x.egitmen_id} value={x.egitmen_id}>{x.ad_soyad}</option>)}</select></label></div>
        <div className="md-form-two"><label>{t.room}<select name="mekan_id" value={roomId} onChange={e => setRoomId(e.target.value)}><option value="">Mekan yok / sonra seç</option>{data.mekanlar.filter(x => x.aktif !== false).map(x => <option key={x.mekan_id} value={x.mekan_id}>{x.mekan_adi}</option>)}</select></label><label>Süre<input name="sure_dk" type="number" min="15" max="360" value={duration} onChange={e => setDuration(Number(e.target.value))} required/></label></div>
        <div className="md-form-three"><label>Gün<select name="haftanin_gunu" defaultValue="1">{GUNLER.map((x, i) => <option value={i + 1} key={x}>{x}</option>)}</select></label><label>Saat<input name="baslangic_saati" type="time" defaultValue="10:00" required/></label><label>Başlangıç<input name="baslangic_tarihi" type="date" defaultValue={localIso(new Date())} required/></label></div>
        <label>Bitiş Tarihi <small>(opsiyonel)</small><input name="bitis_tarihi" type="date"/></label>
        <label>Not <small>(opsiyonel)</small><textarea name="aciklama" rows={2} placeholder="Programla ilgili kısa not…"/></label>
        <div className="md-program-form-note"><Sparkles/><span>Haftayı hazırlarken eğitmen, stüdyo/salon ve kursiyer çakışmaları otomatik kontrol edilir. Çakışan ders atlanır, diğerleri oluşturulur.</span></div>
        <div className="md-form-actions"><button type="button" className="md-secondary" onClick={() => setProgramOpen(false)}>Vazgeç</button><button className="md-primary" disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Plus/>}{busy ? 'Kaydediliyor…' : 'Programı Kaydet'}</button></div>
      </form>
    </ProgramModal>

    <ProgramModal open={!!selectedLesson} title={selectedLesson ? lessonName(selectedLesson) : 'Ders'} subtitle={selectedLesson ? `${shortDate(selectedLesson.tarih)} · ${timeShort(selectedLesson.baslangic_saati)} · ${selectedLesson.sure_dk} dk` : undefined} onClose={() => setSelectedLessonId(null)}>
      {selectedLesson && <div className="md-attendance-sheet">
        <div className="md-lesson-status-editor"><div><small>DERS DURUMU</small><strong>{data.branslar.find(x => x.brans_id === selectedLesson.brans_id)?.brans_adi || t.branch}</strong></div><select value={selectedLesson.ders_durumu} disabled={busyKey === `lesson-${selectedLesson.ders_id}`} onChange={e => void setLessonStatus(selectedLesson.ders_id, e.target.value as MdDersDurumu)}>{DERS_DURUMLARI.map(x => <option key={x}>{x}</option>)}</select></div>
        <div className="md-attendance-title"><span>YOKLAMA</span><strong>{selectedAttendances.length} katılımcı</strong></div>
        <div className="md-attendance-list">{selectedAttendances.map(attendance => {
          const person = data.kursiyerler.find(x => x.kursiyer_id === attendance.kursiyer_id)
          return <article key={attendance.katilim_id}><div className="md-attendance-person"><span>{person?.ad_soyad.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('tr-TR') || '—'}</span><div><strong>{person?.ad_soyad || t.student}</strong><small>{attendance.katilim_durumu}</small></div></div><div className="md-attendance-actions">{KATILIM_DURUMLARI.map(status => <button type="button" key={status} className={attendance.katilim_durumu === status ? `active ${statusClass(status)}` : ''} disabled={busyKey === `attendance-${attendance.katilim_id}`} onClick={() => void setAttendance(attendance.katilim_id, status)}>{status === 'Katıldı' ? <Check/> : status === 'Gelmedi' ? <X/> : null}{status}</button>)}</div></article>
        })}</div>
        {!selectedAttendances.length && <div className="md-program-zero compact"><Users/><div><strong>Katılımcı snapshot’ı yok.</strong><span>Bu ders program motoru dışında oluşturulmuş olabilir.</span></div></div>}
      </div>}
    </ProgramModal>
  </div>
}
