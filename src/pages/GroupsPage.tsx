import { CalendarDays, GraduationCap, LoaderCircle, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../components/AppDataProvider'
import { t } from '../lib/productProfile'
import { grupVerisiniGetir, type GrupVeriDurumu } from '../services/groupService'

export function GroupsPage() {
  const { data } = useAppData()
  const [grupVerisi, setGrupVerisi] = useState<GrupVeriDurumu | null>(null)
  const [hata, setHata] = useState<string | null>(null)

  useEffect(() => {
    let aktif = true
    void grupVerisiniGetir()
      .then(sonuc => { if (aktif) setGrupVerisi(sonuc) })
      .catch((error: unknown) => {
        if (!aktif) return
        setHata(error instanceof Error ? error.message : String(error))
      })
    return () => { aktif = false }
  }, [])

  const ozet = useMemo(() => {
    if (!data) return { ogretmen: 0, brans: 0, derslik: 0 }
    return {
      ogretmen: data.ogretmenler.filter(x => x.durum !== 'Pasif').length,
      brans: data.branslar.filter(x => x.aktif !== false).length,
      derslik: data.derslikler.filter(x => x.aktif !== false).length,
    }
  }, [data])

  if (!data) return null

  const aktifUyeSayisi = (grupId: string) => grupVerisi?.uyeler.filter(x => x.grup_id === grupId && x.durum !== 'Pasif').length || 0
  const ad = (liste: { [key: string]: unknown }[], idAlan: string, adAlan: string, id?: string | null) => {
    if (!id) return '—'
    const kayit = liste.find(x => String(x[idAlan] || '') === id)
    return kayit ? String(kayit[adAlan] || '—') : '—'
  }

  return <div className="page-stack groups-v1 artistic-groups-page">
    <section className="page-title-row"><div><span className="eyebrow">GRUP YÖNETİMİ</span><h1>Gruplar</h1><p>Topluluk derslerini, kontenjanı ve stüdyo akışını tek yerde izleyin.</p></div></section>

    <section className="kpi-grid three compact-kpis">
      <div className="kpi-card teal"><div className="kpi-icon"><GraduationCap/></div><span>Aktif {t.teacher}</span><strong>{ozet.ogretmen}</strong><small>grup dersi için kullanılabilir</small></div>
      <div className="kpi-card blue"><div className="kpi-icon"><CalendarDays/></div><span>{t.branch}</span><strong>{ozet.brans}</strong><small>aktif sanat alanı</small></div>
      <div className="kpi-card orange"><div className="kpi-icon"><Users/></div><span>{t.room}</span><strong>{ozet.derslik}</strong><small>aktif çalışma mekanı</small></div>
    </section>

    {hata && <div className="inline-error">{hata}</div>}

    {!grupVerisi && !hata && <div className="calm-empty"><LoaderCircle className="spin"/><b>Grup altyapısı kontrol ediliyor.</b><span>Mevcut demo veritabanına herhangi bir değişiklik yapılmıyor.</span></div>}

    {grupVerisi && !grupVerisi.hazir && <div className="calm-empty"><Users/><b>Grup dersleri için veri katmanı henüz etkin değil.</b><span>{grupVerisi.neden === 'API_YETKISI_YOK' ? 'Tablolar mevcut olabilir ancak Data API yetkisi henüz açılmamış.' : 'Bu güvenli geliştirme dalında grup tabloları henüz demo veritabanına uygulanmadı.'} Birebir ders ve finans sistemi değişmeden çalışmaya devam eder.</span></div>}

    {grupVerisi?.hazir && <section className="group-stage-section">
      <div className="section-heading"><div><h2>Aktif Gruplar</h2><span>{grupVerisi.gruplar.filter(x => x.durum !== 'Pasif').length} grup</span></div></div>
      {grupVerisi.gruplar.length ? <div className="group-stage-grid">
        {grupVerisi.gruplar.map((grup, index) => {
          const uye = aktifUyeSayisi(grup.grup_id)
          const kapasite = Number(grup.kapasite || 0)
          const doluluk = kapasite > 0 ? Math.min(100, Math.round((uye / kapasite) * 100)) : 0
          const brans = ad(data.branslar as unknown as { [key: string]: unknown }[], 'brans_id', 'brans_adi', grup.brans_id)
          const ogretmen = ad(data.ogretmenler as unknown as { [key: string]: unknown }[], 'ogretmen_id', 'ad_soyad', grup.varsayilan_ogretmen_id)
          const derslik = ad(data.derslikler as unknown as { [key: string]: unknown }[], 'derslik_id', 'mekan_adi', grup.varsayilan_derslik_id)
          return <article className={`group-card group-tone-${(index % 4) + 1}`} key={grup.grup_id}>
            <div className="group-card-head">
              <div className="group-emblem" aria-hidden="true"><Users size={18}/></div>
              <div className="group-card-title"><span>{brans}</span><strong>{grup.grup_adi}</strong></div>
              <span className="soft-pill">{grup.durum || 'Aktif'}</span>
            </div>
            <div className="group-card-tags">
              {grup.seviye && <span>{grup.seviye}</span>}
              {grup.yas_grubu && <span>{grup.yas_grubu}</span>}
            </div>
            <div className="group-occupancy">
              <div><span>Kontenjan</span><b>{uye}{kapasite ? ` / ${kapasite}` : ''}</b></div>
              {kapasite > 0 && <><div className="group-progress" aria-label={`Doluluk yüzde ${doluluk}`}><span style={{width:`${doluluk}%`}}/></div><small>%{doluluk} dolu</small></>}
            </div>
            <div className="group-card-meta">
              <div><span>{t.teacher}</span><b>{ogretmen}</b></div>
              <div><span>{t.room}</span><b>{derslik}</b></div>
            </div>
          </article>
        })}
      </div> : <div className="calm-empty"><Users/><b>Henüz grup tanımlanmamış.</b><span>Veri katmanı hazır; grup oluşturma işlemi bir sonraki güvenli adımda bağlanacak.</span></div>}
    </section>}
  </div>
}
