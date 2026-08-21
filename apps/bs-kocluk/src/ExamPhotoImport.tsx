import { AlertTriangle, Camera, CheckCircle2, ImagePlus, LoaderCircle, ScanLine, ShieldCheck, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { prepareExamPhoto, readExamPhoto, type ExamPhotoRead } from './examPhoto'
import { studentName, studentProfile, type CoachData } from './data'

export function ExamPhotoImport({ data, studentId, onClose, onApply, onManual }: {
  data: CoachData
  studentId?: string
  onClose: () => void
  onApply: (read: ExamPhotoRead) => void
  onManual: () => void
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState('')
  const [reading, setReading] = useState<ExamPhotoRead | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const takePhoto = () => cameraInputRef.current?.click()
  const chooseExisting = () => libraryInputRef.current?.click()

  const process = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    setBusy(true)
    setError(null)
    setReading(null)
    try {
      const imageDataUrl = await prepareExamPhoto(file)
      setPreview(imageDataUrl)
      const response = await readExamPhoto({
        imageDataUrl,
        studentId,
        examTypeHint: studentId ? studentProfile(data, studentId)?.sinav_turu || '' : '',
      })
      if (!response.aktif) {
        if (response.durum === 'yapilandirma_gerekli') {
          setError('AI fotoğraf okuma henüz güvenli API anahtarıyla etkinleştirilmedi. Elle ekleme akışı kullanılabilir.')
        } else {
          setError('Fotoğraf şu anda otomatik okunamadı. Başka bir fotoğraf deneyin veya elle ekleyin.')
        }
        return
      }
      if (!response.okuma) throw new Error('Fotoğraftan sonuç çıkarılamadı.')
      setReading(response.okuma)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fotoğraf okunamadı.')
    } finally {
      setBusy(false)
    }
  }

  const readableRows = reading?.bolumler.filter(row => row.dogru || row.yanlis || row.bos).length || 0

  return <div className="exam-add-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className="exam-photo-sheet" role="dialog" aria-modal="true" aria-labelledby="exam-photo-title">
      <header className="exam-photo-head">
        <div><span><ScanLine/> AI FOTOĞRAF OKUMA</span><h2 id="exam-photo-title">Deneme sonucunu fotoğraftan doldur</h2><p>Fotoğraf yalnız sonuçları okumak için gönderilir; kayıt ancak siz kontrol edip onaylarsanız oluşur.</p></div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Kapat"><X/></button>
      </header>

      <div className="exam-photo-body">
        {studentId && <div className="exam-student-context"><span>Öğrenci</span><b>{studentName(data, studentId)}</b></div>}
        <input ref={cameraInputRef} className="exam-photo-file" type="file" accept="image/*" capture="environment" onChange={event => void process(event)} aria-label="Kamerayla fotoğraf çek"/>
        <input ref={libraryInputRef} className="exam-photo-file" type="file" accept="image/*,.png,.jpg,.jpeg,.webp,.heic,.heif" onChange={event => void process(event)} aria-label="Galeriden veya dosyalardan fotoğraf seç"/>

        {!preview && <div className="exam-photo-source-grid">
          <button type="button" className="exam-photo-capture" onClick={takePhoto} disabled={busy}>
            <Camera/><div><b>Fotoğraf Çek</b><span>Deneme sonucunu şimdi kamerayla çekin.</span></div>
          </button>
          <button type="button" className="exam-photo-capture exam-photo-library" onClick={chooseExisting} disabled={busy}>
            <ImagePlus/><div><b>Galeriden veya Dosyadan Seç</b><span>Hazır fotoğraf, ekran görüntüsü veya cihazdaki bir görseli kullanın.</span></div>
          </button>
        </div>}

        {preview && <div className="exam-photo-preview-wrap">
          <img className="exam-photo-preview" src={preview} alt="Seçilen deneme sonucu"/>
          <div className="exam-photo-replace-actions">
            <button type="button" className="exam-photo-replace" onClick={takePhoto} disabled={busy}><Camera/> Yeniden Çek</button>
            <button type="button" className="exam-photo-replace" onClick={chooseExisting} disabled={busy}><ImagePlus/> Başka Görsel Seç</button>
          </div>
        </div>}

        {busy && <div className="exam-photo-status reading"><LoaderCircle/><div><b>Sonuçlar okunuyor…</b><span>Ders, doğru ve yanlış alanları ayrıştırılıyor.</span></div></div>}
        {error && <div className="exam-photo-status error"><AlertTriangle/><div><b>Otomatik okuma tamamlanamadı</b><span>{error}</span></div></div>}

        {reading && <div className="exam-photo-review">
          <div className="exam-photo-confidence"><CheckCircle2/><div><b>AI taslağı hazır</b><span>Genel okuma güveni %{reading.genel_guven} · {readableRows} ders/bölüm sonucu bulundu.</span></div></div>
          <div className="exam-photo-facts">
            <span><small>Sınav</small><b>{reading.sinav_turu}</b></span>
            <span><small>Deneme</small><b>{reading.deneme_adi || 'Kontrol gerekli'}</b></span>
            <span><small>Tarih</small><b>{reading.deneme_tarihi || 'Kontrol gerekli'}</b></span>
          </div>
          {reading.uyarilar.length > 0 && <div className="exam-photo-warnings"><b>Kontrol edilmesi gerekenler</b>{reading.uyarilar.map((warning, index) => <span key={`${index}-${warning}`}>• {warning}</span>)}</div>}
          <div className="exam-photo-minirows">{reading.bolumler.slice(0, 8).map((row, index) => <div key={`${index}-${row.bolum_adi}`}><b>{row.bolum_adi}</b><span>D {row.dogru || '—'} · Y {row.yanlis || '—'} · B {row.bos || '—'}</span><small>%{row.guven}</small></div>)}</div>
          <div className="exam-photo-privacy"><ShieldCheck/><span>AI hiçbir sonucu doğrudan kaydetmez. Sonraki ekranda bütün alanları kontrol edip değiştirebilirsiniz.</span></div>
        </div>}
      </div>

      <footer className="exam-photo-actions">
        <button type="button" onClick={onClose} disabled={busy}>Vazgeç</button>
        {error && <button type="button" onClick={onManual}>Elle Ekle</button>}
        <button type="button" className="primary" disabled={!reading || busy} onClick={() => reading && onApply(reading)}>Kontrol Et</button>
      </footer>
    </section>
  </div>
}
