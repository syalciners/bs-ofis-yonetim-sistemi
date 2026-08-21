import { CalendarDays, GraduationCap, LoaderCircle, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { t } from '../lib/productProfile'
import { grupVerisiniGetir, type GrupVeriDurumu } from '../services/groupService'

export function GroupsPage() {
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

  const ozet = useMemo(() => ({
    egitmen: grupVerisi?.egitmenler.filter(x => x.durum !== 'Pasif').length || 0,
    brans: grupVerisi?.branslar.filter(x => x.aktif !== false).length || 0,
    mekan: grupVerisi?.mekanlar.filter(x => x.aktif !== false).length || 0,
  }), [grupVerisi])

  const aktifUyeSayisi = (grupId: string) => grupVerisi?.uyeler.filter(x => x.grup_id === grupId && x.durum !== 'Pasif').length || 0
  const bransAdi = (id?: string | null) => grupVerisi?.branslar.find(x => x.brans_id === id)?.brans_adi || '—'
  const egitmenAdi = (id?: string | null) => grupVerisi?.egitmenler.find(x => x.egitmen_id === id)?.ad_soyad || '—'
  const mekanAdi = (id?: string | null) => grupVerisi?.mekanlar.find(x => x.mekan_id === id)?.mekan_adi || '—'

  return <div className="page-stack groups-v1 artistic-groups-page">
    <section className="page-title-row"><div><span className="eyebrow">GRUP YÖNETİMİ</span><h1>Gruplar</h1><p>Topluluk derslerini, kontenjanı ve stüdyo akışını tek yerde izleyin.</p></div></section>

    <section className="kpi-grid three compact-kpis">
      <div className="kpi-card teal"><div className="kpi-icon"><GraduationCap/></div><span>Aktif {t.teacher}</span><strong>{ozet.egitmen}</strong><small>grup dersi için kullanılabilir</small></div>
      <div className="kpi-card blue"><div className="kpi-icon"><CalendarDays/></div><span>{t.branch}</span><strong>{ozet.brans}</strong><small>aktif sanat alanı</small></div>
      <div className="kpi-card orange"><div className="kpi-icon"><Users/></div><span>{t.room}</span><strong>{ozet.mekan}</strong><small>aktif çalışma mekanı</small></div>
    </section>

    {hata && <div className="inline-error">{hata}</div>}

    {!grupVerisi && !hata && <div className="calm-empty"><LoaderCircle className="spin"/><b>Grup altyapısı kontrol ediliyor.</b><span>Yalnız Müzik & Dans veri alanı okunuyor.</span></div>}

    {grupVerisi && !grupVerisi.hazir && <div className="calm-empty"><Users/><b>Grup dersleri veri alanına erişilemiyor.</b><span>{grupVerisi.neden === 'API_YETKISI_YOK' ? 'Oturumun Müzik & Dans kurum üyeliği henüz tanımlanmamış olabilir.' : 'Müzik & Dans tabloları bu ortamda bulunamadı.'} Mevcut BS Eğitim verileri kullanılmaz.</span></div>}

    {grupVerisi?.hazir && <section className="group-stage-section">
      <div className="section-heading"><div><h2>Aktif Gruplar</h2><span>{grupVerisi.gruplar.filter(x => x.durum !== 'Pasif').length} grup</span></div></div>
      {grupVerisi.gruplar.length ? <div className="group-stage-grid">
        {grupVerisi.gruplar.map((grup, index) => {
          const uye = aktifUyeSayisi(grup.grup_id)
          const kapasite = Number(grup.kapasite || 0)
          const doluluk = kapasite > 0 ? Math.min(100, Math.round((uye / kapasite) * 100)) : 0
          return <article className={`group-card group-tone-${(index % 4) + 1}`} key={grup.grup_id}>
            <div className="group-card-head">
              <div className="group-emblem" aria-hidden="true"><Users size={18}/></div>
              <div className="group-card-title"><span>{bransAdi(grup.brans_id)}</span><strong>{grup.grup_adi}</strong></div>
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
              <div><span>{t.teacher}</span><b>{egitmenAdi(grup.varsayilan_egitmen_id)}</b></div>
              <div><span>{t.room}</span><b>{mekanAdi(grup.varsayilan_mekan_id)}</b></div>
            </div>
          </article>
        })}
      </div> : <div className="calm-empty"><Users/><b>Henüz grup tanımlanmamış.</b><span>Müzik & Dans veri katmanı hazır. İlk grup tanımı bir sonraki kontrollü adımda eklenecek.</span></div>}
    </section>}
  </div>
}
