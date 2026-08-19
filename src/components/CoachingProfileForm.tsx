import { useState } from 'react'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'
import { todayISO } from '../lib/format'
import { saveCoachingProfile, type KoclukOgrenciProfili } from '../services/coachingService'

export function CoachingProfileForm({
  profile,
  onDone,
  onCancel,
}: {
  profile?: KoclukOgrenciProfili | null
  onDone: () => void | Promise<void>
  onCancel: () => void
}) {
  const { data } = useAppData()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  if (!data) return null

  const activeStudents = data.ogrenciler.filter(x => x.durum !== 'Pasif')
  const activeTeachers = data.ogretmenler.filter(x => x.durum !== 'Pasif')

  return <form className="form-grid" onSubmit={async e => {
    e.preventDefault()
    setBusy(true)
    const f = new FormData(e.currentTarget)
    const scoreRaw = String(f.get('hedef_puan') || '').trim()
    const rankRaw = String(f.get('hedef_siralama') || '').trim()
    try {
      await saveCoachingProfile({
        ogrenci_id: String(f.get('ogrenci_id') || ''),
        koc_ogretmen_id: String(f.get('koc_ogretmen_id') || '') || null,
        sinav_turu: String(f.get('sinav_turu') || '') || null,
        hedef_okul: String(f.get('hedef_okul') || '') || null,
        hedef_bolum: String(f.get('hedef_bolum') || '') || null,
        hedef_puan: scoreRaw ? Number(scoreRaw) : null,
        hedef_siralama: rankRaw ? Number(rankRaw) : null,
        baslangic_tarihi: String(f.get('baslangic_tarihi') || '') || todayISO(),
        durum: String(f.get('durum') || 'Aktif') as 'Aktif' | 'Pasif',
        notlar: String(f.get('notlar') || '') || null,
      })
      toast(profile ? 'Koçluk profili güncellendi.' : 'Koçluk profili oluşturuldu.')
      await onDone()
    } catch (err: any) {
      toast(err?.message || String(err), 'error')
    } finally {
      setBusy(false)
    }
  }}>
    {profile && <input type="hidden" name="ogrenci_id" value={profile.ogrenci_id}/>} 
    <label>Öğrenci
      <select name={profile ? undefined : 'ogrenci_id'} defaultValue={profile?.ogrenci_id || ''} disabled={!!profile} required={!profile}>
        <option value="">Seçin</option>
        {activeStudents.map(x => <option key={x.ogrenci_id} value={x.ogrenci_id}>{x.ad_soyad}</option>)}
      </select>
    </label>
    <label>Koç
      <select name="koc_ogretmen_id" defaultValue={profile?.koc_ogretmen_id || ''}>
        <option value="">Henüz atanmadı</option>
        {activeTeachers.map(x => <option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}
      </select>
    </label>
    <label>Sınav Türü
      <select name="sinav_turu" defaultValue={profile?.sinav_turu || ''}>
        <option value="">Seçin</option>
        <option>YKS</option>
        <option>LGS</option>
        <option>MSÜ</option>
        <option>Diğer</option>
      </select>
    </label>
    <label>Başlangıç Tarihi<input name="baslangic_tarihi" type="date" defaultValue={profile?.baslangic_tarihi || todayISO()}/></label>
    <label>Hedef Okul<input name="hedef_okul" defaultValue={profile?.hedef_okul || ''} placeholder="Örn. Hacettepe Üniversitesi"/></label>
    <label>Hedef Bölüm<input name="hedef_bolum" defaultValue={profile?.hedef_bolum || ''} placeholder="Örn. Psikoloji"/></label>
    <label>Hedef Puan<input name="hedef_puan" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={profile?.hedef_puan ?? ''}/></label>
    <label>Hedef Sıralama<input name="hedef_siralama" type="number" min="1" step="1" inputMode="numeric" defaultValue={profile?.hedef_siralama ?? ''}/></label>
    <label>Durum<select name="durum" defaultValue={profile?.durum || 'Aktif'}><option>Aktif</option><option>Pasif</option></select></label>
    <label className="wide">Koçluk Notu<textarea name="notlar" rows={3} defaultValue={profile?.notlar || ''} placeholder="Öğrencinin hedefi ve başlangıç durumu için kısa not…"/></label>
    <div className="wide form-actions">
      <button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button>
      <button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Koçluk Profilini Kaydet'}</button>
    </div>
  </form>
}
