import { useState } from 'react'
import { money, todayISO } from '../lib/format'
import { saveTeacherPayment } from '../services/officeService'
import { useAppData } from './AppDataProvider'
import { useToast } from './Toast'

export function TeacherPaymentQuickForm({ teacherId, onDone, onCancel }: { teacherId?: string; onDone: () => void; onCancel: () => void }) {
  const { data, refresh } = useAppData()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [teacher, setTeacher] = useState(teacherId || '')
  const today = todayISO()
  const availablePeriods = (data?.hakedisDonemleri || []).filter(x => x.aktif !== false && x.baslangic_tarihi <= today).sort((a,b) => b.baslangic_tarihi.localeCompare(a.baslangic_tarihi))
  const currentPeriod = availablePeriods.find(x => today >= x.baslangic_tarihi && today <= x.bitis_tarihi)
  const fallbackPeriod = availablePeriods[0]
  const [period, setPeriod] = useState(currentPeriod?.hakedis_donemi_id || fallbackPeriod?.hakedis_donemi_id || '')

  if (!data) return null

  const periodObj = data.hakedisDonemleri.find(x => x.hakedis_donemi_id === period)
  const earned = periodObj
    ? data.dersler.filter(x => x.ogretmen_id === teacher && x.ders_durumu === 'Yapıldı' && (x.tarih || '') >= periodObj.baslangic_tarihi && (x.tarih || '') <= periodObj.bitis_tarihi).reduce((sum, x) => sum + Number(x.ogretmen_toplam_hakedis || 0), 0)
    : 0
  const paid = periodObj
    ? data.ogretmenOdemeleri.filter(x => x.ogretmen_id === teacher && x.hakedis_donemi_id === period && !x.iptal_mi).reduce((sum, x) => sum + Number(x.tutar || 0), 0)
    : 0
  const remaining = Math.max(earned - paid, 0)

  return <form className="form-grid" onSubmit={async e => {
    e.preventDefault()
    setBusy(true)
    const f = new FormData(e.currentTarget)
    try {
      await saveTeacherPayment({
        ogretmen_id: String(f.get('ogretmen_id')),
        hakedis_donemi_id: String(f.get('hakedis_donemi_id')),
        tutar: Number(f.get('tutar')),
        tarih: String(f.get('tarih')),
        odeme_yontemi: String(f.get('odeme_yontemi')),
        hesap_id: String(f.get('hesap_id') || '') || null,
        aciklama: String(f.get('aciklama') || '') || null,
      })
      await refresh()
      toast('Öğretmen ödemesi kaydedildi.')
      onDone()
    } catch (err: any) {
      toast(err.message || String(err), 'error')
    } finally {
      setBusy(false)
    }
  }}>
    <label>Öğretmen<select name="ogretmen_id" value={teacher} onChange={e => setTeacher(e.target.value)} required><option value="">Seçin</option>{data.ogretmenler.filter(x => x.durum !== 'Pasif').map(x => <option key={x.ogretmen_id} value={x.ogretmen_id}>{x.ad_soyad}</option>)}</select></label>
    <label>Hakediş Dönemi<select name="hakedis_donemi_id" value={period} onChange={e => setPeriod(e.target.value)} required><option value="">Seçin</option>{availablePeriods.map(x => <option key={x.hakedis_donemi_id} value={x.hakedis_donemi_id}>{x.donem_adi}</option>)}</select></label>
    {teacher && period && <div className="wide form-summary">Dönem hakedişi <b>{money(earned)}</b> · Ödenen <b>{money(paid)}</b> · Kalan <b>{money(remaining)}</b>{period === currentPeriod?.hakedis_donemi_id ? ' · Güncel dönem otomatik seçildi' : ''}</div>}
    <label>Tutar<input name="tutar" type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={remaining || ''} key={`${teacher}-${period}-${remaining}`} required /></label>
    <label>Tarih<input name="tarih" type="date" defaultValue={today} required /></label>
    <label>Yöntem<select name="odeme_yontemi" defaultValue="Havale/EFT"><option>Havale/EFT</option><option>Nakit</option></select></label>
    <label>Hesap<select name="hesap_id"><option value="">Otomatik</option>{data.kasaHesaplari.filter(x => x.aktif !== false).map(x => <option key={x.hesap_id} value={x.hesap_id}>{x.hesap_adi}</option>)}</select></label>
    <label className="wide">Açıklama<textarea name="aciklama" rows={2} /></label>
    <div className="wide form-actions"><button className="secondary-btn" type="button" onClick={onCancel}>Vazgeç</button><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Ödemeyi Kaydet'}</button></div>
  </form>
}
