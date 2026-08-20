import { createClient } from 'npm:@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
})

const compact = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ')
const cleanIsbn = (value: unknown) => compact(value).replace(/[^0-9Xx]/g, '').toUpperCase()

type RawBookRead = {
  arama_metni: string
  isbn: string
  kitap_adi_ipucu: string
  yayinevi_ipucu: string
  sinif_ipucu: string
  ders_ipucu: string
  kitap_turu_ipucu: string
  guven: number
  uyarilar: string[]
}

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim()
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (part?.type === 'output_text' && typeof part?.text === 'string' && part.text.trim()) return part.text.trim()
    }
  }
  return ''
}

function cleanRead(value: RawBookRead) {
  let isbn = cleanIsbn(value?.isbn)
  if (!(isbn.length === 13 && (isbn.startsWith('978') || isbn.startsWith('979')))) isbn = ''
  const title = compact(value?.kitap_adi_ipucu).slice(0, 160)
  const publisher = compact(value?.yayinevi_ipucu).slice(0, 100)
  const grade = compact(value?.sinif_ipucu).slice(0, 50)
  const subject = compact(value?.ders_ipucu).slice(0, 60)
  const kind = compact(value?.kitap_turu_ipucu).slice(0, 70)
  const searchParts = [isbn, title, publisher, grade, subject, kind].filter(Boolean)
  const suggested = compact(value?.arama_metni).slice(0, 180)
  return {
    arama_metni: isbn || suggested || searchParts.join(' '),
    isbn,
    kitap_adi_ipucu: title,
    yayinevi_ipucu: publisher,
    sinif_ipucu: grade,
    ders_ipucu: subject,
    kitap_turu_ipucu: kind,
    guven: Math.min(100, Math.max(0, Math.round(Number(value?.guven) || 0))),
    uyarilar: Array.isArray(value?.uyarilar) ? value.uyarilar.map(compact).filter(Boolean).slice(0, 5) : [],
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Yalnızca POST desteklenir.' }, 405)

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Oturum gerekli.' }, 401)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })

    const { data: authData, error: authError } = await client.auth.getUser()
    if (authError || !authData.user) return json({ error: 'Oturum doğrulanamadı.' }, 401)

    const { data: profile, error: profileError } = await client
      .from('kullanici_profilleri')
      .select('rol,aktif')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle()
    if (profileError || !profile?.aktif || !['Yönetici', 'Koç'].includes(String(profile?.rol || ''))) {
      return json({ error: 'Bu işlem için aktif Yönetici veya Koç hesabı gerekir.' }, 403)
    }

    const body = await req.json().catch(() => ({})) as { image_data_url?: unknown }
    const imageDataUrl = String(body.image_data_url || '')
    if (!/^data:image\/(jpeg|png|webp);base64,/i.test(imageDataUrl)) {
      return json({ error: 'JPG, PNG veya WEBP biçiminde bir kitap fotoğrafı gerekli.' }, 400)
    }
    if (imageDataUrl.length > 8_000_000) return json({ error: 'Görsel çok büyük. Daha düşük çözünürlüklü bir fotoğraf deneyin.' }, 413)

    const openAiKey = Deno.env.get('OPENAI_API_KEY') || ''
    if (!openAiKey) return json({ basarili: true, aktif: false, durum: 'yapilandirma_gerekli' })

    const model = Deno.env.get('OPENAI_BOOK_VISION_MODEL') || 'gpt-5.6-luna'
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 700,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: [
              'Bir eğitim kitabının ön veya arka kapak fotoğrafını katalog araması için okuyorsun.',
              'Yalnız görselde açıkça okunabilen bilgileri çıkar; kapalı, bulanık veya görünmeyen hiçbir bilgiyi tahmin etme.',
              'ISBN yalnız barkodun altında veya kapakta açıkça okunuyorsa doldur. ISBN uydurma, eksik rakam tamamlama veya internetten tahmin etme.',
              'Kitap adı, yayınevi, sınıf, ders ve kitap türü yalnız görünüyorsa yaz; emin değilsen boş bırak.',
              'arama_metni gerçek katalogda arama yapmaya uygun kısa bir ifade olsun. Açıkça okunan ISBN varsa arama_metni yalnız ISBN olabilir.',
              'Kişi adı, telefon, e-posta, okul etiketi, el yazısı veya öğrenciye ait kişisel bilgileri çıkarma.',
              'Fotoğraftan çıkarılan bilgi doğrudan veritabanına yazılmayacak; katalog eşleşmesi için kullanılacak.',
              'guven yalnız görsel okuma güvenini 0-100 arasında ifade etsin. Şüpheli noktaları kısa Türkçe uyarilar listesine ekle.',
            ].join(' ') }],
          },
          { role: 'user', content: [{ type: 'input_image', image_url: imageDataUrl }] },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'kitap_kapak_okuma',
            strict: true,
            schema: {
              type: 'object', additionalProperties: false,
              properties: {
                arama_metni: { type: 'string' },
                isbn: { type: 'string' },
                kitap_adi_ipucu: { type: 'string' },
                yayinevi_ipucu: { type: 'string' },
                sinif_ipucu: { type: 'string' },
                ders_ipucu: { type: 'string' },
                kitap_turu_ipucu: { type: 'string' },
                guven: { type: 'integer', minimum: 0, maximum: 100 },
                uyarilar: { type: 'array', items: { type: 'string' }, maxItems: 5 },
              },
              required: ['arama_metni','isbn','kitap_adi_ipucu','yayinevi_ipucu','sinif_ipucu','ders_ipucu','kitap_turu_ipucu','guven','uyarilar'],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      console.error('kitap-kapak-oku-v1 OpenAI', response.status, (await response.text().catch(() => '')).slice(0, 500))
      return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
    }

    const payload = await response.json()
    const text = extractOutputText(payload)
    if (!text) return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
    let parsed: RawBookRead
    try { parsed = JSON.parse(text) as RawBookRead } catch { return json({ basarili: true, aktif: false, durum: 'gecici_hata' }) }
    const read = cleanRead(parsed)
    if (!read.arama_metni) return json({ basarili: true, aktif: true, durum: 'okunamadi', okuma: read })
    return json({ basarili: true, aktif: true, model, okuma: read })
  } catch (error) {
    console.error('kitap-kapak-oku-v1', error)
    return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
  }
})
