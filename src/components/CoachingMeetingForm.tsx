import { useMemo, useState } from 'react'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'
import { todayISO } from '../lib/format'
import { saveCoachingMeeting, type KoclukGorusmesi, type KoclukOgrenciProfili } from '../services/coachingService'

export function CoachingMeetingForm({
  meeting,
  profiles,
  onDone,
  onCancel,
}: {
  meeting?: KoclukGorusmesi | null
  profiles: KoclukOgrenciProfili[]
  onDone: () => void | Promise<void>
  onCancel: () => void
}) {
  const { data } = useAppData()
  const { toast } = useToast()
  const activeProfiles = useMemo(() => profiles.filter(x => x.durum === 'Aktif'), [profiles])
  const initialStudent = meeting?.ogrenci_id || activeProfiles[0]?.ogrenci_id || ''
  const initialProfile = activeProfiles.find(x => x.ogrenci_id === initialStudent)
  const [studentId, setStudentId] = useState(initialStudent)
  const [coachId, setCoachId] = useState(meeting?.koc_ogretmen_id || initialProfile?.koc_ogretmen_id || '')
  const [busy, setBusy] = useState(false)

  if (!data) return null

  const activeTeachers = data.ogretmenler.filter(x => x.durum !== 'Pasif')

  return <form className="form-grid" onSubmit={async e => {
    e.preventDefault()
    setBusy(true)
    const f = new FormData(e.currentTarget)
    try {
      await saveCoachingMeeting({
        gorusme_id: meeting?.gorusme_id || null,
        ogrenci_id: studentId,
        koc_ogretmen_id: coachId || null,
        gorusme_tarihi: String(f.get('gorusme_tarihi') || ''),
        baslangic_saati: String(f.get('baslangic_saati') || '') || null,
        gorusme_turu: String(f.get('gorusme_turu') || '') || null,
        durum: String(f.get('durum') || 'Planlandı') as KoclukGorusmesi['durum'],
        gundem: String(f.get('gundem') || '') || null,
        gorusme_notu: String(f.get('gorusme_notu') || '') || null,
        alinan_kararlar: String(f.get('alinan_kararlar') || '') || null,
        sonraki_gorusme_tarihi: String(f.get('sonraki_gorusme_tarihi') || '') || null,
      })
      toast(meeting ? 'Koçluk görüşmesi güncellendi.' : 'Koçluk görüşmesi kaydedildi.')
      await onDone()
    } catch (err: any) {
      toast(err?.message || String(err), 'error')
    } finally {
      setBusy(false)
    }
  }}>
    <label>Öğrenci
      <select value={studentId} disabled={!!meeting} required onChange={e => {
        const id = e.target.value
        setStudentId(id)
        setCoachId(activeProfiles.find(x => x.ogrenci_id === id)?.koc_ogretmen_id || '')
      }}>
        <option value="">Seçin</option>
        {activeProfiles.map(profile => {
          const student = data.ogrenciler.find(x => x.ogrenci_id === profile.ogrenci_id)
          return <option key={profile.ogrenci_id} value={profile.ogrenci_id}>{student?.ad_soyad || profile.ogrenci_id}</option>
        })}
      </select>
    </label>
    <label>Koç
      <select value={coachId} required onChange={e => setCoachId(e.target.value)}>
        <option value="">Seçin</option>
        {activeTeachers.map(x => <option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}
      </select>
    </label>
    <label>Görüşme Tarihi<input name="gorusme_tarihi" type="date" required defaultValue={meeting?.gorusme_tarihi || todayISO()}/></label>
    <label>Başlangıç Saati<input name="baslangic_saati" type="time" defaultValue={meeting?.baslangic_saati?.slice(0,5) || ''}/></label>
    <label>Görüşme Türü
      <select name="gorusme_turu" defaultValue={meeting?.gorusme_turu || 'Yüz Yüze'}>
        <option>Yüz Yüze</option>
        <option>Online</option>
        <option>Telefon</option>
        <option>Diğer</option>
      </select>
    </label>
    <label>Durum
      <select name="durum" defaultValue={meeting?.durum || 'Planlandı'}>
        <option>Planlandı</option>
        <option>Yapıldı</option>
        <option>Ertelendi</option>
        <option>İptal</option>
      </select>
    </label>
    <label className="wide">Gündem<textarea name="gundem" rows={2} defaultValue={meeting?.gundem || ''} placeholder="Bu görüşmede ele alınacak konular…"/></label>
    <label className="wide">Görüşme Notu<textarea name="gorusme_notu" rows={3} defaultValue={meeting?.gorusme_notu || ''} placeholder="Görüşme sırasında alınan notlar…"/></label>
    <label className="wide">Alınan Kararlar<textarea name="alinan_kararlar" rows={3} defaultValue={meeting?.alinan_kararlar || ''} placeholder="Öğrenciyle birlikte alınan kararlar ve takip maddeleri…"/></label>
    <label>Sonraki Görüşme Tarihi<input name="sonraki_gorusme_tarihi" type="date" defaultValue={meeting?.sonraki_gorusme_tarihi || ''}/></label>
    <div className="wide form-actions">
      <button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button>
      <button className="primary-btn" type="submit" disabled={busy || !studentId || !coachId}>{busy ? 'Kaydediliyor…' : 'Görüşmeyi Kaydet'}</button>
    </div>
  </form>
}
