import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Ogrenci } from '../lib/types'
import { deleteStudentSafe } from '../services/studentAdminService'
import { useAppData } from './AppDataProvider'
import { StudentForm } from './forms'
import { ProfilePhotoEditor } from './ProfilePhotoEditor'
import { useToast } from './Toast'

export function StudentEditPanel({ student, onDone, onCancel }: { student: Ogrenci; onDone: () => void; onCancel: () => void }) {
  const { data, refresh } = useAppData()
  const { toast } = useToast()
  const [deleting, setDeleting] = useState(false)

  if (!data) return null

  const hasHistory =
    data.dersler.some(x => x.ogrenci_id === student.ogrenci_id) ||
    data.sabitProgramlar.some(x => x.ogrenci_id === student.ogrenci_id) ||
    data.tahsilatlar.some(x => x.ogrenci_id === student.ogrenci_id) ||
    data.kasaHareketleri.some(x => x.ogrenci_id === student.ogrenci_id) ||
    data.odevler.some(x => x.ogrenci_id === student.ogrenci_id)

  const remove = async () => {
    if (hasHistory) {
      toast('Bu öğrencinin geçmiş kayıtları var. Silmek yerine Durum alanını Pasif yapıp Kaydet kullanın.', 'error')
      return
    }
    if (!window.confirm(`${student.ad_soyad} kaydı kalıcı olarak silinsin mi?\n\nBu işlem yalnız bağlantısız öğrenci kayıtlarında kullanılabilir.`)) return
    setDeleting(true)
    try {
      await deleteStudentSafe(student.ogrenci_id)
      await refresh()
      toast('Öğrenci kaydı silindi.')
      onDone()
    } catch (e: any) {
      toast(e.message || String(e), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return <div className="student-edit-panel">
    <ProfilePhotoEditor kind="ogrenci" recordId={student.ogrenci_id} name={student.ad_soyad} photoPath={student.profil_fotografi}/>
    <StudentForm student={student} onDone={onDone} onCancel={onCancel}/>
    <section className="record-danger-zone">
      <div><b>Kaydı Sil</b><span>{hasHistory ? 'Geçmiş kaydı bulunan öğrenci silinemez; Pasif yapılmalıdır.' : 'Yalnız hiç ders veya finans geçmişi olmayan kayıt silinebilir.'}</span></div>
      <button type="button" className="danger-btn" disabled={deleting} onClick={() => void remove()}><Trash2 size={16}/>{deleting ? 'Siliniyor…' : 'Öğrenciyi Sil'}</button>
    </section>
  </div>
}
