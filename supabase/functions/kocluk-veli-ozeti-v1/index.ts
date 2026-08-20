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

const compact = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ')
const done = (status: unknown) => ['Tamamlandı', 'Teslim Edildi'].includes(compact(status))
const cancelled = (status: unknown) => compact(status) === 'İptal'

function todayIstanbul() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10)
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

type ParentFacts = {
  baslangic: string
  bitis: string
  takip_edilen_calisma: number
  tamamlanan_calisma: number
  tamamlama_orani: number | null
  geciken_calisma: number
  gelecek_7_gun_calisma: number
  ai_planli_calisma: number
  son_deneme_turu: string | null
  son_deneme_tarihi: string | null
  son_deneme_net: number | null
  onceki_ayni_tur_net: number | null
  net_degisim: number | null
  sonraki_gorusme: string | null
  odak: string
}

function fallbackMessage(facts: ParentFacts) {
  const parts: string[] = []
  if (facts.takip_edilen_calisma > 0) {
    parts.push(`Son 7 günlük takipte ${facts.takip_edilen_calisma} çalışmanın ${facts.tamamlanan_calisma} tanesi tamamlandı${facts.tamamlama_orani != null ? ` (%${facts.tamamlama_orani})` : ''}.`)
  } else {
    parts.push('Son 7 günlük dönemde teslim tarihi gelen kayıtlı çalışma bulunmuyor.')
  }
  if (facts.geciken_calisma > 0) parts.push(`Şu anda ${facts.geciken_calisma} geciken çalışma bulunuyor; önceliğimiz bunları kontrollü biçimde toparlamak.`)
  if (facts.son_deneme_turu && facts.son_deneme_net != null) {
    const delta = facts.net_degisim != null
      ? `, aynı türdeki önceki denemeye göre ${facts.net_degisim > 0 ? '+' : ''}${facts.net_degisim.toLocaleString('tr-TR')} net değişim var`
      : ''
    parts.push(`Son ${facts.son_deneme_turu} sonucunda toplam ${facts.son_deneme_net.toLocaleString('tr-TR')} net görüldü${delta}.`)
  }
  if (facts.gelecek_7_gun_calisma > 0) parts.push(`Önümüzdeki 7 gün için ${facts.gelecek_7_gun_calisma} açık çalışma planlı.`)
  parts.push(`Bu haftaki odağımız: ${facts.odak}.`)
  return parts.join(' ')
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

    const body = await req.json().catch(() => ({})) as { ogrenci_id?: unknown }
    const studentId = compact(body.ogrenci_id)
    if (!studentId) return json({ error: 'Öğrenci seçimi gerekli.' }, 400)

    const { data: coaching, error: coachingError } = await client
      .from('kocluk_ogrenci_profilleri')
      .select('ogrenci_id')
      .eq('ogrenci_id', studentId)
      .eq('durum', 'Aktif')
      .maybeSingle()
    if (coachingError || !coaching) return json({ error: 'Bu öğrenci için koçluk erişiminiz yok.' }, 403)

    const today = todayIstanbul()
    const start = addDays(today, -6)
    const nextEnd = addDays(today, 6)

    const [assignmentsResult, examsResult, meetingsResult] = await Promise.all([
      client.from('odevler')
        .select('odev_id,verilis_tarihi,son_teslim_tarihi,tamamlanma_tarihi,durum,haftalik_plan_id,plan_kaynagi')
        .eq('ogrenci_id', studentId),
      client.from('kocluk_deneme_sinavlari')
        .select('deneme_id,sinav_turu,deneme_tarihi,onay_durumu')
        .eq('ogrenci_id', studentId)
        .neq('onay_durumu', 'İptal')
        .order('deneme_tarihi', { ascending: false })
        .limit(6),
      client.from('kocluk_gorusmeleri')
        .select('gorusme_tarihi,durum')
        .eq('ogrenci_id', studentId)
        .neq('durum', 'İptal')
        .gte('gorusme_tarihi', today)
        .order('gorusme_tarihi', { ascending: true })
        .limit(1),
    ])

    if (assignmentsResult.error) return json({ error: 'Çalışma verileri okunamadı.' }, 500)
    if (examsResult.error) return json({ error: 'Deneme verileri okunamadı.' }, 500)

    const assignments = (assignmentsResult.data || []).filter((item: any) => !cancelled(item.durum))
    const tracked = assignments.filter((item: any) => {
      const due = compact(item.son_teslim_tarihi || item.verilis_tarihi)
      const completed = compact(item.tamamlanma_tarihi)
      return (due && due >= start && due <= today) || (completed && completed >= start && completed <= today)
    })
    const completed = tracked.filter((item: any) => done(item.durum))
    const completion = tracked.length ? Math.round((completed.length / tracked.length) * 100) : null
    const overdue = assignments.filter((item: any) => {
      const due = compact(item.son_teslim_tarihi)
      return due && due < today && !done(item.durum)
    })
    const next = assignments.filter((item: any) => {
      const due = compact(item.son_teslim_tarihi)
      return due && due >= today && due <= nextEnd && !done(item.durum)
    })
    const aiPlanned = next.filter((item: any) => compact(item.plan_kaynagi).toLocaleUpperCase('tr-TR') === 'AI' || compact(item.haftalik_plan_id).startsWith('AIP-'))

    const exams = examsResult.data || []
    let latestNet: number | null = null
    let previousSameNet: number | null = null
    let latestType: string | null = null
    let latestDate: string | null = null
    let delta: number | null = null

    if (exams.length) {
      const latest = exams[0] as any
      latestType = compact(latest.sinav_turu) || null
      latestDate = compact(latest.deneme_tarihi) || null
      const previousSame = exams.slice(1).find((item: any) => compact(item.sinav_turu) === latestType)
      const ids = [latest.deneme_id, previousSame?.deneme_id].filter(Boolean)
      if (ids.length) {
        const sectionResult = await client.from('kocluk_deneme_bolum_sonuclari')
          .select('deneme_id,net')
          .in('deneme_id', ids)
        if (!sectionResult.error) {
          const total = (examId: string) => {
            const rows = (sectionResult.data || []).filter((row: any) => row.deneme_id === examId && row.net != null)
            return rows.length ? Math.round(rows.reduce((sum: number, row: any) => sum + Number(row.net || 0), 0) * 100) / 100 : null
          }
          latestNet = total(latest.deneme_id)
          previousSameNet = previousSame ? total(previousSame.deneme_id) : null
          delta = latestNet != null && previousSameNet != null ? Math.round((latestNet - previousSameNet) * 100) / 100 : null
        }
      }
    }

    const nextMeeting = compact((meetingsResult.data || [])[0]?.gorusme_tarihi) || null
    const focus = overdue.length > 0
      ? 'geciken çalışmaları yeni yük bindirmeden toparlamak'
      : completion != null && completion < 65
        ? 'haftalık çalışma ritmini daha sürdürülebilir hale getirmek'
        : delta != null && delta <= -3
          ? 'son denemedeki değişimi ders bazında takip etmek ve planı dengeli sürdürmek'
          : next.length > 0
            ? 'planlanan çalışmaları düzenli ve sürdürülebilir biçimde tamamlamak'
            : 'mevcut çalışma düzenini korumak'

    const facts: ParentFacts = {
      baslangic: start,
      bitis: today,
      takip_edilen_calisma: tracked.length,
      tamamlanan_calisma: completed.length,
      tamamlama_orani: completion,
      geciken_calisma: overdue.length,
      gelecek_7_gun_calisma: next.length,
      ai_planli_calisma: aiPlanned.length,
      son_deneme_turu: latestType,
      son_deneme_tarihi: latestDate,
      son_deneme_net: latestNet,
      onceki_ayni_tur_net: previousSameNet,
      net_degisim: delta,
      sonraki_gorusme: nextMeeting,
      odak: focus,
    }

    const fallback = fallbackMessage(facts)
    const openAiKey = Deno.env.get('OPENAI_API_KEY') || ''
    if (!openAiKey) return json({ basarili: true, aktif: false, durum: 'yapilandirma_gerekli', ozet: fallback, gercekler: facts })

    const model = Deno.env.get('OPENAI_PARENT_SUMMARY_MODEL') || 'gpt-5.6-luna'
    const aiInput = {
      donem: { baslangic: facts.baslangic, bitis: facts.bitis },
      calisma: {
        takip_edilen: facts.takip_edilen_calisma,
        tamamlanan: facts.tamamlanan_calisma,
        tamamlama_orani: facts.tamamlama_orani,
        geciken: facts.geciken_calisma,
        gelecek_7_gun: facts.gelecek_7_gun_calisma,
      },
      deneme: {
        tur: facts.son_deneme_turu,
        tarih: facts.son_deneme_tarihi,
        son_net: facts.son_deneme_net,
        onceki_ayni_tur_net: facts.onceki_ayni_tur_net,
        degisim: facts.net_degisim,
      },
      sonraki_gorusme: facts.sonraki_gorusme,
      odak: facts.odak,
    }

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
              'Bir eğitim koçunun veliye göndereceği kısa haftalık bilgilendirme metnini yaz.',
              'Yalnız verilen doğrulanmış sayısal gerçekleri kullan; hiçbir olay, neden, duygu, tanı, davranış veya başarı sebebi uydurma.',
              'Öğrenciyi veya veliyi suçlayıcı, yargılayıcı, kaygı artırıcı dil kullanma.',
              'İç görüşme notu, kişisel veri, isim, telefon veya kimlik isteme ya da üretme.',
              'Metin Türkçe, sıcak ama profesyonel, WhatsApp için 3-5 kısa cümle ve en fazla 700 karakter olsun.',
              'Karşılaştırılabilir deneme yoksa eğilim iddiası kurma. Veri yoksa o başlığı hiç anma.',
              'Selamlama ve kapanış yazma; uygulama bunları ayrıca ekleyecek.',
            ].join(' ') }],
          },
          { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(aiInput) }] },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'veli_haftalik_ozet',
            strict: true,
            schema: {
              type: 'object', additionalProperties: false,
              properties: { ozet: { type: 'string' } },
              required: ['ozet'],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      console.error('kocluk-veli-ozeti-v1 OpenAI', response.status, (await response.text().catch(() => '')).slice(0, 500))
      return json({ basarili: true, aktif: false, durum: 'gecici_hata', ozet: fallback, gercekler: facts })
    }

    const payload = await response.json()
    const outputText = extractOutputText(payload)
    if (!outputText) return json({ basarili: true, aktif: false, durum: 'gecici_hata', ozet: fallback, gercekler: facts })

    try {
      const parsed = JSON.parse(outputText) as { ozet?: unknown }
      const summary = compact(parsed.ozet).slice(0, 900)
      return json({ basarili: true, aktif: true, model, ozet: summary || fallback, gercekler: facts })
    } catch (error) {
      console.error('kocluk-veli-ozeti-v1 JSON', error)
      return json({ basarili: true, aktif: false, durum: 'gecici_hata', ozet: fallback, gercekler: facts })
    }
  } catch (error) {
    console.error('kocluk-veli-ozeti-v1', error)
    return json({ error: 'Veli özeti hazırlanamadı. Lütfen tekrar deneyin.' }, 500)
  }
})
