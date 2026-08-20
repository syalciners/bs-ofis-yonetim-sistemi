import { Camera, CheckCircle2, ImagePlus, LoaderCircle, ScanLine, Sparkles, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { supabase } from './supabase'

type CaptureResult = {
  arama_metni: string
  isbn: string
  kitap_adi_ipucu: string
  yayinevi_ipucu: string
  guven: number
  uyarilar: string[]
}

const cleanIsbn = (value: unknown) => String(value || '').replace(/[^0-9Xx]/g, '').toUpperCase()

function validBookIsbn(value: string) {
  return value.length === 13 && (value.startsWith('978') || value.startsWith('979'))
}

async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Lütfen bir kitap fotoğrafı seçin.')
  if (file.size > 12 * 1024 * 1024) throw new Error('Fotoğraf çok büyük. Daha düşük çözünürlüklü bir fotoğraf deneyin.')
  const bitmap = await createImageBitmap(file)
  const maxSide = 1600
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * ratio))
  const height = Math.max(1, Math.round(bitmap.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Fotoğraf hazırlanamadı.')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', .84)
}

async function detectBarcode(file: File): Promise<string> {
  const BarcodeDetectorCtor = (window as any).BarcodeDetector
  if (!BarcodeDetectorCtor) return ''
  try {
    const formats = typeof BarcodeDetectorCtor.getSupportedFormats === 'function'
      ? await BarcodeDetectorCtor.getSupportedFormats()
      : ['ean_13', 'ean_8']
    const wanted = ['ean_13', 'ean_8'].filter(item => formats.includes(item))
    if (!wanted.length) return ''
    const detector = new BarcodeDetectorCtor({ formats: wanted })
    const bitmap = await createImageBitmap(file)
    const rows = await detector.detect(bitmap)
    bitmap.close()
    for (const row of rows || []) {
      const isbn = cleanIsbn(row?.rawValue)
      if (validBookIsbn(isbn)) return isbn
    }
  } catch {
    return ''
  }
  return ''
}

function friendlyError(message: string) {
  const text = message.toLocaleLowerCase('tr-TR')
  if (text.includes('oturum')) return 'Oturum doğrulanamadı. Sayfayı yenileyip tekrar deneyin.'
  if (text.includes('yetki') || text.includes('yönetici') || text.includes('koç')) return 'Bu işlem için aktif koçluk hesabı gerekiyor.'
  if (text.includes('fotoğraf') || text.includes('görsel')) return message
  return 'Kitap okunamadı. Barkodu veya kapağı daha net çekip tekrar deneyin.'
}

export function BookCapture({ onRecognized, onClose }: { onRecognized: (query: string, note: string) => void; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CaptureResult | null>(null)

  const process = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    setStatus('Barkod kontrol ediliyor…')
    try {
      const objectUrl = URL.createObjectURL(file)
      setPreview(previous => {
        if (previous) URL.revokeObjectURL(previous)
        return objectUrl
      })
      const barcode = await detectBarcode(file)
      if (barcode) {
        setResult({ arama_metni: barcode, isbn: barcode, kitap_adi_ipucu: '', yayinevi_ipucu: '', guven: 100, uyarilar: [] })
        setStatus('ISBN barkoddan okundu.')
        return
      }
      setStatus('Kapak yapay zekâ ile okunuyor…')
      const imageDataUrl = await compressImage(file)
      const { data, error: functionError } = await supabase.functions.invoke('kitap-kapak-oku-v1', { body: { image_data_url: imageDataUrl } })
      if (functionError) throw functionError
      if (!data?.basarili || !data?.okuma) throw new Error('Kapak okuması tamamlanamadı.')
      const read = data.okuma as CaptureResult
      if (!String(read.arama_metni || '').trim()) throw new Error('Kapakta arama için yeterli bilgi okunamadı.')
      setResult(read)
      setStatus(read.isbn ? 'ISBN ve kapak bilgileri okundu.' : 'Kapak bilgileri okundu.')
    } catch (err: any) {
      setError(friendlyError(err?.message || String(err)))
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  const useResult = () => {
    if (!result?.arama_metni) return
    const tags = [result.isbn ? `ISBN ${result.isbn}` : '', result.kitap_adi_ipucu, result.yayinevi_ipucu].filter(Boolean)
    onRecognized(result.arama_metni, tags.join(' · ') || 'Kapaktan okundu')
    onClose()
  }

  return <div className="book-capture-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !loading) onClose() }}>
    <section className="book-capture-sheet" role="dialog" aria-modal="true" aria-labelledby="book-capture-title">
      <header className="book-capture-head"><div><span><Sparkles/> HIZLI KİTAP TANIMA</span><h3 id="book-capture-title">Barkodu veya kapağı göster</h3><p>Tek fotoğraf yeterli. Önce ISBN barkodu okunur; gerekirse kapaktaki kitap adı ve yayınevi AI ile çıkarılır.</p></div><button type="button" onClick={onClose} disabled={loading} aria-label="Kapat"><X/></button></header>
      <input ref={inputRef} className="book-capture-input" type="file" accept="image/*" capture="environment" onChange={process}/>
      {!preview ? <button type="button" className="book-capture-camera" onClick={() => inputRef.current?.click()} disabled={loading}><span><Camera/></span><div><b>Fotoğraf Çek</b><small>Arka kapaktaki barkod en hızlı sonuç verir. Ön kapak da kullanılabilir.</small></div><ScanLine/></button> : <div className="book-capture-preview"><img src={preview} alt="Çekilen kitap"/>{loading && <div className="book-capture-reading"><LoaderCircle className="spin"/><b>{status || 'Okunuyor…'}</b></div>}</div>}
      {error && <div className="book-capture-error"><span>{error}</span><button type="button" onClick={() => inputRef.current?.click()}><Camera/> Tekrar Çek</button></div>}
      {result && !loading && <div className="book-capture-result"><div className="book-capture-result-title"><CheckCircle2/><div><span>OKUNDU</span><b>{result.isbn ? `ISBN ${result.isbn}` : result.kitap_adi_ipucu || 'Kitap bilgisi bulundu'}</b><small>{result.yayinevi_ipucu || status}</small></div><strong>%{Math.round(Number(result.guven || 0))}</strong></div>{result.uyarilar?.length > 0 && <small className="book-capture-warning">{result.uyarilar[0]}</small>}<div className="book-capture-actions"><button type="button" className="secondary" onClick={() => inputRef.current?.click()}><ImagePlus/> Yeniden Çek</button><button type="button" className="primary" onClick={useResult}><ScanLine/> Kitabı Bul</button></div></div>}
      <p className="book-capture-privacy">Fotoğraf kalıcı olarak saklanmaz. AI sonucu doğrudan kitap kaydı oluşturmaz; gerçek katalog eşleşmesi bulunmadan kesin veri kabul edilmez.</p>
    </section>
  </div>
}
