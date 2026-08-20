import { createClient } from 'npm:@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

const compact = (value: unknown) => String(value ?? '').trim()
const allowedTypes = new Set(['plan-balance', 'weekly-plan', 'exam-review', 'meeting-prepare', 'decision-action', 'parent-summary'])

function numberOrNull(value: unknown, min: number, max: number) {
  if (value == null || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return Math.max(min, Math.min(max, number))
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

type Candidate = {
  anahtar: string
  tur: string
  oncelik: number
  geciken: number
  haftalik_tamamlama: number | null
  deneme_degisim: number | null
  gorusmeye_gun: number | null
  gelecek_7_gun_acik: number
  bekleyen_gorusme_karari: boolean
}

function fallback(candidates: Candidate[]) {
  return [...candidates]
    .sort((a, b) => b.oncelik - a.oncelik)
    .slice(0, 3)
    .map(item => ({ anahtar: item.anahtar, gerekce: 'Doğrulanmış öncelik puanına göre öne çıktı.' }))
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
    if (profileError || !profile?.aktif || !['Yönetici', 'Koç'].includes(String(profile.rol || ''))) {
      return json({ error: 'Bu işlem için aktif Yönetici veya Koç hesabı gerekir.' }, 403)
    }

    const body = await req.json().catch(() => ({})) as { adaylar?: unknown }
    const raw = Array.isArray(body.adaylar) ? body.adaylar.slice(0, 8) : []
    const seen = new Set<string>()
    const candidates: Candidate[] = []

    for (const item of raw as any[]) {
      const key = compact(item?.anahtar)
      const type = compact(item?.tur)
      if (!/^a[1-8]$/.test(key) || seen.has(key) || !allowedTypes.has(type)) continue
      seen.add(key)
      candidates.push({
        anahtar: key,
        tur: type,
        oncelik: numberOrNull(item?.oncelik, 0, 120) ?? 0,
        geciken: numberOrNull(item?.geciken, 0, 100) ?? 0,
        haftalik_tamamlama: numberOrNull(item?.haftalik_tamamlama, 0, 100),
        deneme_degisim: numberOrNull(item?.deneme_degisim, -200, 200),
        gorusmeye_gun: numberOrNull(item?.gorusmeye_gun, 0, 30),
        gelecek_7_gun_acik: numberOrNull(item?.gelecek_7_gun_acik, 0, 100) ?? 0,
        bekleyen_gorusme_karari: Boolean(item?.bekleyen_gorusme_karari),
      })
    }

    if (!candidates.length) return json({ basarili: true, aktif: false, sirali: [] })
    if (candidates.length === 1) return json({ basarili: true, aktif: false, sirali: fallback(candidates) })

    const openAiKey = Deno.env.get('OPENAI_API_KEY') || ''
    if (!openAiKey) return json({ basarili: true, aktif: false, durum: 'yapilandirma_gerekli', sirali: fallback(candidates) })

    const keys = candidates.map(item => item.anahtar)
    const model = Deno.env.get('OPENAI_COACH_ASSISTANT_MODEL') || 'gpt-5.6-luna'
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 500,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: [
              'Bir eğitim koçunun bugünkü işlerini önceliklendiriyorsun.',
              'Yalnız verilen adayları sırala; yeni aksiyon, öğrenci bilgisi, olay, sebep veya yorum uydurma.',
              'Öncelik puanı 94 ve üzerindeki adaylar kritik kabul edilir ve ilk sıralarda korunmalıdır.',
              'Bugünkü görüşme, bekleyen görüşme kararı ve büyüyen gecikme yüksek önceliklidir.',
              'Aynı öğrencide iki aksiyon varsa gerçekten gerekli olanı öne çıkar; gereksiz tekrar oluşturma.',
              'En fazla 3 aday döndür. Gerekçe Türkçe, kısa, eylem odaklı ve 90 karakterden kısa olsun.',
              'Girdi anonimdir; isim veya kimlik tahmin etme.',
            ].join(' ') }],
          },
          { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ adaylar: candidates }) }] },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'koc_asistan_oncelik',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                sirali: {
                  type: 'array',
                  maxItems: 3,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      anahtar: { type: 'string', enum: keys },
                      gerekce: { type: 'string', maxLength: 90 },
                    },
                    required: ['anahtar', 'gerekce'],
                  },
                },
              },
              required: ['sirali'],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(16000),
    })

    if (!response.ok) {
      console.error('kocluk-ai-asistan-v1 OpenAI', response.status, (await response.text().catch(() => '')).slice(0, 400))
      return json({ basarili: true, aktif: false, durum: 'ai_gecici_kullanilamiyor', sirali: fallback(candidates) })
    }

    const payload = await response.json()
    const outputText = extractOutputText(payload)
    const parsed = JSON.parse(outputText || '{}') as { sirali?: Array<{ anahtar?: unknown; gerekce?: unknown }> }
    const valid: Array<{ anahtar: string; gerekce: string }> = []
    const used = new Set<string>()
    for (const row of Array.isArray(parsed.sirali) ? parsed.sirali : []) {
      const key = compact(row?.anahtar)
      const reason = compact(row?.gerekce).slice(0, 90)
      if (!keys.includes(key) || used.has(key) || !reason) continue
      used.add(key)
      valid.push({ anahtar: key, gerekce: reason })
      if (valid.length === 3) break
    }

    return json({ basarili: true, aktif: valid.length > 0, sirali: valid.length ? valid : fallback(candidates) })
  } catch (error) {
    console.error('kocluk-ai-asistan-v1', error)
    return json({ error: 'Asistan önceliklendirmesi hazırlanamadı.' }, 500)
  }
})
