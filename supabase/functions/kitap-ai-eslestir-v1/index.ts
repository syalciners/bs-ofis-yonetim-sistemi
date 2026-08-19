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

type AiIntent = {
  arama_metni: string
  alternatif_aramalar: string[]
  sinif: string
  ders: string
  yayinevi: string
  seri: string
  kitap_turu: string
  baski_ipucu: string
  renk_ipucu: string
  isbn: string
  guven: number
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

function cleanIntent(value: AiIntent, fallback: string): AiIntent {
  const compact = (input: unknown) => String(input || '').trim().replace(/\s+/g, ' ')
  const alternatives = Array.isArray(value?.alternatif_aramalar)
    ? value.alternatif_aramalar.map(compact).filter(Boolean).slice(0, 3)
    : []
  return {
    arama_metni: compact(value?.arama_metni) || fallback,
    alternatif_aramalar: alternatives,
    sinif: compact(value?.sinif),
    ders: compact(value?.ders),
    yayinevi: compact(value?.yayinevi),
    seri: compact(value?.seri),
    kitap_turu: compact(value?.kitap_turu),
    baski_ipucu: compact(value?.baski_ipucu),
    renk_ipucu: compact(value?.renk_ipucu),
    isbn: compact(value?.isbn).replace(/[^0-9Xx]/g, '').toUpperCase(),
    guven: Math.min(100, Math.max(0, Number(value?.guven) || 0)),
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

    if (profileError || !profile || profile.rol !== 'Yönetici' || !profile.aktif) {
      return json({ error: 'Bu işlem için yönetici yetkisi gerekir.' }, 403)
    }

    const body = await req.json().catch(() => ({})) as { query?: unknown }
    const query = String(body.query || '').trim().replace(/\s+/g, ' ')
    if (query.length < 2) return json({ error: 'Arama için en az 2 karakter yazın.' }, 400)
    if (query.length > 160) return json({ error: 'Arama metni çok uzun.' }, 400)

    const openAiKey = Deno.env.get('OPENAI_API_KEY') || ''
    if (!openAiKey) {
      return json({ basarili: true, aktif: false, durum: 'yapilandirma_gerekli' })
    }

    const model = Deno.env.get('OPENAI_BOOK_SEARCH_MODEL') || 'gpt-5.6'
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 450,
        input: [
          {
            role: 'system',
            content: [{
              type: 'input_text',
              text: [
                'Türkçe eğitim yayınları için kitap arama niyetini normalize eden bir arama katmanısın.',
                'Görevin yalnız kullanıcının yazdığı ifadeyi arama niyetine çevirmektir; kitap hakkında yeni gerçekler üretme.',
                'Açıkça söylenmeyen yayınevi, seri, ISBN, baskı, renk, sınıf veya ders bilgisini uydurma.',
                'Kısaltmaları güvenle açabilirsin: mat=matematik, sb=soru bankası, sinif=sınıf gibi.',
                'Renk veya kapak ipucu arama niyetinde korunmalı ama doğrulanmış metadata gibi ele alınmamalı.',
                'ISBN yalnız kullanıcının metninde gerçekten varsa doldurulmalı.',
                'arama_metni alanı kısa, doğal ve katalog aramasına uygun olmalı.',
                'alternatif_aramalar en fazla üç kısa varyasyon içermeli.',
              ].join(' '),
            }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: `Kitap araması: ${query}` }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'kitap_arama_niyeti',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                arama_metni: { type: 'string' },
                alternatif_aramalar: { type: 'array', items: { type: 'string' }, maxItems: 3 },
                sinif: { type: 'string' },
                ders: { type: 'string' },
                yayinevi: { type: 'string' },
                seri: { type: 'string' },
                kitap_turu: { type: 'string' },
                baski_ipucu: { type: 'string' },
                renk_ipucu: { type: 'string' },
                isbn: { type: 'string' },
                guven: { type: 'integer', minimum: 0, maximum: 100 },
              },
              required: ['arama_metni', 'alternatif_aramalar', 'sinif', 'ders', 'yayinevi', 'seri', 'kitap_turu', 'baski_ipucu', 'renk_ipucu', 'isbn', 'guven'],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('kitap-ai-eslestir-v1 OpenAI', response.status, detail.slice(0, 500))
      return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
    }

    const payload = await response.json()
    const outputText = extractOutputText(payload)
    if (!outputText) {
      console.error('kitap-ai-eslestir-v1 boş çıktı')
      return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
    }

    let parsed: AiIntent
    try {
      parsed = JSON.parse(outputText) as AiIntent
    } catch (error) {
      console.error('kitap-ai-eslestir-v1 JSON', error)
      return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
    }

    return json({
      basarili: true,
      aktif: true,
      model,
      yorum: cleanIntent(parsed, query),
    })
  } catch (error) {
    console.error('kitap-ai-eslestir-v1', error)
    return json({ basarili: true, aktif: false, durum: 'gecici_hata' })
  }
})
