import { Check, Clock3, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Ders } from '../lib/types'
import { addMinutes, fmtDate, fmtTime, money, uid } from '../lib/format'
import { updateLessonStatus } from '../services/officeService'
import { validateAndSaveLesson } from '../services/lessonValidationService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

const LESSON_TYPE_OPTIONS = [
  { value: 'Yüz Yüze', label: 'Yüz Yüze' },
  { value: 'Online', label: 'Online' },
]

const LESSON_STATUS_OPTIONS = [
  { value: 'Planlandı', label: 'Planlandı' },
  { value: 'Yapıldı', label: 'Yapıldı' },
  { value: 'Öğrenci Gelmedi', label: 'Öğrenci Gelmedi' },
  { value: 'İptal', label: 'İptal' },
  { value: 'Ertelendi', label: 'Ertelendi' },
  { value: 'Öğretmen İptali', label: 'Öğretmen İptali' },
]

type StudentPreset = {
  ogrenciId: string
  ogretmenId?: string
  bransId?: string
}

export function PremiumLessonForm({
  lesson,
  initialDate,
  initialTime,
  studentPreset,
  onDone,
  onCancel,
}: {
  lesson?: Ders
  initialDate?: string
  initialTime?: string
  studentPreset?: StudentPreset
  onDone: () => void
  onCancel: () => void
}) {
  const { data, refresh, institution } = useAppData()
  const { toast } = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const initialStudentId = lesson?.ogrenci_id || studentPreset?.ogrenciId || ''
  const initialTeacherId = lesson?.ogretmen_id || studentPreset?.ogretmenId || ''
  const initialBranchId = lesson?.brans_id || studentPreset?.bransId || ''
  const [studentId, setStudentId] = useState(initialStudentId)
  const [teacherId, setTeacherId] = useState(initialTeacherId)
  const [branchId, setBranchId] = useState(initialBranchId)
  const [date, setDate] = useState(lesson?.tarih || initialDate || today)
  const [time, setTime] = useState(fmtTime(lesson?.baslangic_saati) || initialTime || '09:00')
  const [units, setUnits] = useState(Number(lesson?.ders_sayisi || institution?.varsayilan_ders_birimi || 1))
  const [roomId, setRoomId] = useState(lesson?.derslik_id || '')
  const [lessonType, setLessonType] = useState(lesson?.ders_turu || (lesson?.derslik_id ? 'Yüz Yüze' : 'Yüz Yüze'))
  const [studentRate, setStudentRate] = useState(Number(lesson?.ogrenci_birim_ucreti || 0))
  const [teacherRate, setTeacherRate] = useState(Number(lesson?.ogretmen_birim_hakedisi || 0))
  const [status, setStatus] = useState(lesson?.ders_durumu || 'Planlandı')
  const [note, setNote] = useState(lesson?.aciklama || '')
  const [busy, setBusy] = useState(false)

  const student = data?.ogrenciler.find(item => item.ogrenci_id === studentId)
  const teacher = data?.ogretmenler.find(item => item.ogretmen_id === teacherId)
  const branch = data?.branslar.find(item => item.brans_id === branchId)
  const room = data?.derslikler.find(item => item.derslik_id === roomId)
  const effectiveLessonType = lessonType || 'Yüz Yüze'
  const isOnlineLesson = effectiveLessonType === 'Online'
  const studentCandidates = useMemo(
    () => (data?.ogrenciler || []).filter(item => !item.durum || item.durum === 'Aktif'),
    [data?.ogrenciler],
  )
  const studentAssignments = useMemo(
    () => (data?.sabitProgramlar || []).filter(item => item.ogrenci_id === studentId && item.aktif !== false && item.program_durumu !== 'Pasif'),
    [data?.sabitProgramlar, studentId],
  )
  const teacherCandidates = useMemo(() => {
    if (!data) return []
    const teachersByStudent = new Set(studentAssignments.map(item => item.ogretmen_id).filter(Boolean))
    if (teachersByStudent.size > 0) return data.ogretmenler.filter(item => teachersByStudent.has(item.ogretmen_id))
    return data.ogretmenler.filter(item => !item.durum || item.durum === 'Aktif')
  }, [data, studentAssignments])
  const branchCandidates = useMemo(() => {
    if (!data) return []
    const branchesByStudentAndTeacher = new Set(studentAssignments.filter(item => !teacherId || item.ogretmen_id === teacherId).map(item => item.brans_id).filter(Boolean))
    if (branchesByStudentAndTeacher.size > 0) return data.branslar.filter(item => branchesByStudentAndTeacher.has(item.brans_id))
    const branchIdsByTeacher = new Set(data.ogretmenBranslari.filter(item => item.ogretmen_id === teacherId && item.aktif).map(item => item.brans_id))
    if (branchIdsByTeacher.size > 0) return data.branslar.filter(item => branchIdsByTeacher.has(item.brans_id))
    return data.branslar.filter(item => item.aktif !== false)
  }, [data, studentAssignments, teacherId])

  useEffect(() => {
    if (!studentId || lesson?.ders_id) return
    if (studentAssignments.length === 1) {
      const only = studentAssignments[0]
      if (only.ogretmen_id) setTeacherId(only.ogretmen_id)
      if (only.brans_id) setBranchId(only.brans_id)
      if (only.derslik_id && !isOnlineLesson) setRoomId(only.derslik_id)
      if (Number(only.ogrenci_birim_ucreti || 0) > 0) setStudentRate(Number(only.ogrenci_birim_ucreti))
      if (Number(only.ogretmen_birim_hakedisi || 0) > 0) setTeacherRate(Number(only.ogretmen_birim_hakedisi))
      if (Number(only.ders_sayisi || 0) > 0) setUnits(Number(only.ders_sayisi))
    }
  }, [studentId, studentAssignments, lesson?.ders_id, isOnlineLesson])

  useEffect(() => {
    if (!teacherId || !data || lesson?.ders_id) return
    if (!branchId && branchCandidates.length === 1) setBranchId(branchCandidates[0].brans_id)
  }, [teacherId, data, branchCandidates, branchId, lesson?.ders_id])

  useEffect(() => {
    if (isOnlineLesson) setRoomId('')
  }, [isOnlineLesson])

  const financialStudent = Number(studentRate || 0) * Number(units || 0)
  const financialTeacher = Number(teacherRate || 0) * Number(units || 0)

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!data) return
    if (!studentId || !teacherId || !branchId || !date || !time || (!isOnlineLesson && !roomId)) {
      toast('Öğrenci, öğretmen, branş, tarih, saat ve yüz yüze ders için derslik zorunludur.', 'error')
      return
    }
    setBusy(true)
    try {
      const endTime = addMinutes(time, Math.max(1, Number(units || 1)) * 60)
      await validateAndSaveLesson({
        ders_id: lesson?.ders_id || uid('LES'),
        program_id: lesson?.program_id || null,
        tarih: date,
        ogrenci_id: studentId,
        ogretmen_id: teacherId,
        brans_id: branchId,
        derslik_id: isOnlineLesson ? null : roomId,
        ders_sayisi: units,
        ogrenci_birim_ucreti: Number(studentRate || 0),
        ogretmen_birim_hakedisi: Number(teacherRate || 0),
        ogrenci_toplam_tutar: financialStudent,
        ogretmen_toplam_hakedis: financialTeacher,
        ders_durumu: status,
        aciklama: note || null,
        baslangic_saati: time,
        bitis_saati: endTime,
        ders_turu: effectiveLessonType,
        ders_yeri: isOnlineLesson ? 'Online' : room?.mekan_adi || null,
      })
      await refresh()
      toast(lesson ? 'Ders güncellendi.' : 'Ders planlandı.')
      onDone()
    } catch (error: any) {
      toast(error?.message || String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!data) return null

  return <form className="premium-lesson-form" onSubmit={save}>
    <section className="premium-lesson-section is-core">
      <div className="premium-section-head">
        <div><strong>Ders Bilgileri</strong><span>Öğrenci, öğretmen ve branş</span></div>
        <span className="premium-section-index">1</span>
      </div>
      <div className="premium-field-grid premium-field-grid-three">
        <label className="premium-field">
          <span>Öğrenci</span>
          <select value={studentId} onChange={event => { setStudentId(event.target.value); setTeacherId(''); setBranchId('') }} required>
            <option value="">Seçin</option>
            {studentCandidates.map(item => <option key={item.ogrenci_id} value={item.ogrenci_id}>{item.ad_soyad}</option>)}
          </select>
        </label>
        <label className="premium-field">
          <span>Öğretmen</span>
          <select value={teacherId} onChange={event => { setTeacherId(event.target.value); setBranchId('') }} required>
            <option value="">Seçin</option>
            {teacherCandidates.map(item => <option key={item.ogretmen_id} value={item.ogretmen_id}>{item.ad_soyad}</option>)}
          </select>
        </label>
        <label className="premium-field">
          <span>Branş</span>
          <select value={branchId} onChange={event => setBranchId(event.target.value)} required>
            <option value="">Seçin</option>
            {branchCandidates.map(item => <option key={item.brans_id} value={item.brans_id}>{item.brans_adi}</option>)}
          </select>
        </label>
      </div>
      {(student || teacher || branch) && <div className="premium-selection-strip">
        {student && <span><Check size={13}/>{student.ad_soyad}</span>}
        {teacher && <span><Check size={13}/>{teacher.ad_soyad}</span>}
        {branch && <span><Check size={13}/>{branch.brans_adi}</span>}
      </div>}
    </section>

    <section className="premium-lesson-section is-time">
      <div className="premium-section-head">
        <div><strong>Zamanlama</strong><span>Dersin günü, saati ve süresi</span></div>
        <span className="premium-section-index">2</span>
      </div>
      <div className="premium-field-grid premium-field-grid-time">
        <label className="premium-field">
          <span>Tarih</span>
          <input type="date" value={date} onChange={event => setDate(event.target.value)} required />
        </label>
        <label className="premium-field">
          <span>Başlangıç Saati</span>
          <div className="premium-input-icon"><Clock3 size={15}/><input type="time" value={time} onChange={event => setTime(event.target.value)} required /></div>
        </label>
        <div className="premium-field premium-units-field">
          <span>Ders Birimi</span>
          <div className="premium-unit-switch" role="group" aria-label="Ders birimi">
            {[1, 2].map(value => <button key={value} type="button" className={units === value ? 'active' : ''} onClick={() => setUnits(value)}>{value} ders</button>)}
          </div>
        </div>
      </div>
    </section>

    <section className="premium-lesson-section is-location">
      <div className="premium-section-head">
        <div><strong>Ders Ortamı</strong><span>Yüz yüze veya online ders</span></div>
        <span className="premium-section-index">3</span>
      </div>
      <div className="premium-mode-row">
        {LESSON_TYPE_OPTIONS.map(option => <button key={option.value} type="button" className={`premium-mode-button ${effectiveLessonType === option.value ? 'active' : ''}`} onClick={() => setLessonType(option.value)}>{option.label}</button>)}
      </div>
      {!isOnlineLesson && <label className="premium-field premium-room-field">
        <span>Derslik</span>
        <div className="premium-input-icon"><MapPin size={15}/><select value={roomId} onChange={event => setRoomId(event.target.value)} required={!isOnlineLesson}>
          <option value="">Derslik seçin</option>
          {data.derslikler.filter(item => item.aktif !== false).map(item => <option key={item.derslik_id} value={item.derslik_id}>{item.mekan_adi}</option>)}
        </select></div>
      </label>}
      {isOnlineLesson && <div className="premium-online-note">Online derslerde derslik seçimi yapılmaz. Zoom bağlantısı ders kaydına bağlı entegrasyon üzerinden yönetilir.</div>}
    </section>

    <section className="premium-lesson-section is-finance">
      <div className="premium-section-head">
        <div><strong>Finansal Bilgiler</strong><span>Birim ücret ve öğretmen hakedişi</span></div>
        <span className="premium-section-index">4</span>
      </div>
      <div className="premium-field-grid premium-field-grid-finance">
        <label className="premium-field"><span>Öğrenci Birim Ücreti</span><input type="number" min="0" step="0.01" value={studentRate} onChange={event => setStudentRate(Number(event.target.value))}/></label>
        <label className="premium-field"><span>Öğretmen Birim Hakedişi</span><input type="number" min="0" step="0.01" value={teacherRate} onChange={event => setTeacherRate(Number(event.target.value))}/></label>
        <div className="premium-finance-total"><span>Öğrenci Toplamı</span><strong>{money(financialStudent)}</strong></div>
        <div className="premium-finance-total"><span>Öğretmen Toplamı</span><strong>{money(financialTeacher)}</strong></div>
      </div>
    </section>

    <section className="premium-lesson-section is-details">
      <div className="premium-section-head">
        <div><strong>Durum ve Not</strong><span>Dersin mevcut durumu ve açıklaması</span></div>
        <span className="premium-section-index">5</span>
      </div>
      <div className="premium-field-grid premium-field-grid-details">
        <label className="premium-field"><span>Ders Durumu</span><select value={status} onChange={event => setStatus(event.target.value)}>{LESSON_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="premium-field premium-note-field"><span>Açıklama</span><textarea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="İsteğe bağlı not"/></label>
      </div>
    </section>

    <div className="premium-lesson-footer">
      <button type="button" className="secondary-btn" onClick={onCancel}>Vazgeç</button>
      <button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Kaydediliyor…' : lesson ? 'Dersi Güncelle' : 'Dersi Kaydet'}</button>
    </div>

    {lesson && lesson.ders_durumu !== status && <button type="button" className="premium-status-shortcut" disabled={busy} onClick={async () => {
      setBusy(true)
      try {
        await updateLessonStatus(lesson.ders_id, status)
        await refresh()
        toast('Ders durumu güncellendi.')
        onDone()
      } catch (error: any) { toast(error?.message || String(error), 'error') } finally { setBusy(false) }
    }}>Yalnız Durumu Kaydet</button>}
  </form>
}
