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

type RawSection = {
  bolum_adi: string
  soru_sayisi: string
  dogru: string
  yanlis: string
  bos: string
  guven: number
}

type RawExamRead = {
  sinav_turu: 'LGS' | 'TYT' | 'AYT' | 'Diğer' | 'Belirsiz'
  deneme_adi: string
  deneme_tarihi: string
  yayinevi: string
  puan: string
  siralama: string
  yuzdelik: string
  genel_guven: number
  bolumler: RawSection[]
  uyarilar: string[]
}

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim()
  const output = Array.isArray(payload?.output) ? payload.output : []
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : []
    for (const part of content) {
      if (part?.type === 'output_text' && typeof part?.text === 'string' && part.text.trim()) return part.text.trim()
    }
  }
  return ''
}

const compact = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ')

function numericText(value: unknown, integer = false) {
  const raw = compact(value).replace(',', '.')
  if (!raw) return ''
  const parsed = integer ? Number.parseInt(raw, 10) : Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return ''
  return integer ? String(Math.trunc(parsed)) : String(parsed)
}

function cleanRead(value: RawExamRead): RawExamRead {
  const allowed = new Set(['LGS', 'TYT', 'AYT', 'Diğer', 'Belirsiz'])
  const sections = Array.isArray(value?.bolumler) ? value.bolumler.slice(0, 20).map((row) => {
    const dogru = numericText(row?.dogru, true)
    const yanlis = numericText(row?.yanlis, true)
    const bos = numericText(row?.bos, true)
    let soruSayisi = numericText(row?.soru_sayisi, true)
    if (!soruSayisi && dogru && yanlis && bos) {
      soruSayisi = String(Number(dogru) + Number(yanlis) + Number(bos))
    }
    return {
      bolum_adi: compact(row?.bolum_adi).slice(0, 100),
      soru_sayisi: soruSayisi,
      dogru,
      yanlis,
      bos,
      guven: Math.min(100, Math.max(0, Math.round(Number(row?.guven) || 0))),
    }
  }).filter((row) => row.bolum_adi) : []

  return {
    sinav_turu: allowed.has(value?.sinav_turu) ? value.sinav_turu : 'Belirsiz',
    deneme_adi: compact(value?.deneme_adi).slice(0, 160),
    deneme_tarihi: compact(value?.deneme_tarihi).slice(0, 10),
    yayinevi: compact(value?.yayinevi).slice(0, 120),
    puan: numericText(value?.puan),
    siralama: numericText(value?.siralama, true),
    yuzdelik: numericText(value?.yuzdelik),
    genel_guven: Math.min(100, Math.max(0, Math.round(Number(value?.genel_guven) || 0))),
    bolumler: sections,
    uyarilar: Array.isArray(value?.uyarilar) ? value.uyarilar.map(compact).filter(Boolean).slice(0, 8) : [],
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

    const allowed = Boolean(profile?.aktif && ['Yönetici', 'Koç'].includes(String(profile?.rol || '')))
    if (profileError || !profile || !allowed) {
      return json({ error: 'Bu işlem için aktif Yönetici veya Koç hesabı gerekir.' }, 403)
    }

    const body = await req.json().catch(() => ({})) as {
      image_data_url?: unknown
      ogrenci_id?: unknown
      sinav_turu_ipucu?: unknown
    }

    const imageDataUrl = String(body.image_data_url || '')
    const studentId = compact(body.ogrenci_id)
    const examTypeHint = compact(body.sinav_turu_ipucu)

    if (!/^data:image\/(jpeg|png|webp);base64,/i.test(imageDataUrl)) {
      return json({ error: 'JPG, PNG veya WEBP biçiminde bir görsel gerekli.' }, 400)
    }
    if (imageDataUrl.length > 8_000_000) {
      return json({ error: 'Görsel çok büyük. Daha düşük çözünürlüklü bir fotoğraf deneyin.' }, 413)
    }

    if (studentId) {
      const { data: coachingProfile, error: accessError } = await client
        .from('kocluk_ogrenci_profilleri')
        .select('ogrenci_id')
        .eq('ogrenci_id', studentId)
        .eq('durum', 'Aktif')
        .maybeSingle()
      if (accessError || !coachingProfile) return json({ error: 'Bu öğrenci için koçluk erişiminiz yok.' }, 403)
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY') || ''
    if (!openAiKey) {
      return json({ basarili: true, aktif: false, durum: 'yapilandirma_gerekli' })
    }

    const model = Deno.env.get('OPENAI_EXAM_VISION_MODEL') || 'gpt-5.6-luna'
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 2200,
        input: [
          {
            role: 'system',
            content: [{
              type: 'input_text',
              text: [
                'Bir eğitim kurumunun deneme sonucu fotoğrafını yapılandırılmış veriye çeviriyorsun.',
                'Yalnız görselde açıkça okunabilen bilgileri çıkar. Eksik, kapalı, bulanık veya görünmeyen değeri ASLA tahmin etme; boş string kullan.',
                'Öğrenci adı, telefon, e-posta veya başka kişisel bilgileri çıkarma ve döndürme.',
                'Ders/bölüm satırlarında yalnız açıkça görülen doğru, yanlış, boş ve soru sayısını yaz.',
                'Soru sayısı görünmüyor ama doğru, yanlış ve boş üçünün tamamı açıkça görünüyorsa soru sayısı bunların toplamı olabilir.',
                'Yalnız net değeri görünüyorsa doğru/yanlış sayılarını netten geriye doğru tahmin etme.',
                'Deneme tarihi görünürse YYYY-MM-DD biçimine dönüştür; yıl görünmüyorsa yıl uydurma ve boş bırak.',
                'Sınav türü yalnız açıkça yazıyorsa veya ders yapısı çok belirgin biçimde LGS/TYT/AYT ise seç; aksi halde Belirsiz kullan.',
                'Her bölüm için 0-100 okuma güveni, tüm görsel için genel güven üret. Güven puanı sadece okuma netliğini ifade eder.',
                'Şüpheli veya tutarsız gördüğün noktaları uyarilar listesine kısa Türkçe cümlelerle ekle.',
              ].join(' '),
            }],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Deneme sonuç görselini oku. Sınav türü ipucu: ${examTypeHint || 'yok'}. Çıktı yalnız doğrulama taslağıdır; hiçbir kayıt oluşturma.`,
              },
              { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'deneme_fotograf_okuma',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                sinav_turu: { type: 'string', enum: ['LGS', 'TYT', 'AYT', 'Diğer', 'Belirsiz'] },
                deneme_adi: { type: 'string' },
                deneme_tarihi: { type: 'string' },
                yayinevi: { type: 'string' },
                puan: { type: 'string' },
                siralama: { type: 'string' },
                yuzdelik: { type: 'string' },
                genel_guven: { type: 'integer', minimum: 0, maximum: 100 },
                bolumler: {
                  type: 'array',
                  maxItems: 20,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      bolum_adi: { type: 'string' },
                      soru_sayisi: { type: 'string' },
                      dogru: { type: 'string' },
                      yanlis: { type: 'string' },
                      bos: { type: 'string' },
                      guven: { type: 'integer', minimum: 0, maximum: 100 },
                    },
                    required: ['bolum_adi', 'soru_sayisi', 'dogru', 'yanlis', 'bos', 'guven'],
                  },
                },
                uyarilar: { type: 'array', items: { type: 'string' }, maxItems: 8 },
              },
              required: ['sinav_turu', 'deneme_adi', 'deneme_tarihi', 'yayinevi', 'puan', 'siralama', 'yuzdelik', 'genel_guven', 'bolumler', 'uyarilar'],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('deneme-fotograf-oku-v1 OpenAI', response.status, detail.slice(0, 700))
      return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
    }

    const payload = await response.json()
    const outputText = extractOutputText(payload)
    if (!outputText) return json({ basarili: true, aktif: false, durum: 'gecici_hata' })

    let parsed: RawExamRead
    try {
      parsed = JSON.parse(outputText) as RawExamRead
    } catch (error) {
      console.error('deneme-fotograf-oku-v1 JSON', error)
      return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
    }

    return json({
      basarili: true,
      aktif: true,
      model,
      okuma: cleanRead(parsed),
    })
  } catch (error) {
    console.error('deneme-fotograf-oku-v1', error)
    return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
  }
})
