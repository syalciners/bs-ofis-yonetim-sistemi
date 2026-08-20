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

function istanbulToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const value = new Date(Date.UTC(y, m - 1, d + days, 12))
  return value.toISOString().slice(0, 10)
}

function dayName(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: 'Europe/Istanbul' })
    .format(new Date(`${iso}T12:00:00+03:00`))
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
  id: string
  studentBookId: string
  bookName: string
  bookMeta: string
  subject: string
  type: 'Sayfa' | 'Test'
  startNo: number
  endNo: number
  maxNo: number | null
  history: string
}

type AiPlan = {
  baslik: string
  ozet: string
  odaklar: string[]
  secimler: Array<{ aday_id: string; tarih: string; gerekce: string }>
  uyarilar: string[]
}

function clampText(value: unknown, max: number) {
  return compact(value).slice(0, max)
}

function fallbackPlan(candidates: Candidate[], allowedDates: string[], maxNew: number, reason: string | null): AiPlan {
  const picks = candidates.slice(0, maxNew).map((candidate, index) => ({
    aday_id: candidate.id,
    tarih: allowedDates[index % Math.max(allowedDates.length, 1)] || addDays(istanbulToday(), index + 1),
    gerekce: candidate.history,
  }))
  return {
    baslik: reason ? 'Önce mevcut planı dengele' : 'Bu haftanın güvenli çalışma planı',
    ozet: reason || (picks.length ? 'Gerçek çalışma geçmişindeki ritim korunarak yeni çalışmalar günlere dengeli dağıtıldı.' : 'Otomatik plan için yeterli gerçek çalışma geçmişi bulunmuyor.'),
    odaklar: [],
    secimler: reason ? [] : picks,
    uyarilar: reason ? ['Yeni yük eklenmedi.'] : [],
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

    const body = await req.json().catch(() => ({})) as { ogrenci_id?: unknown; mod?: unknown }
    const studentId = compact(body.ogrenci_id)
    const mode = compact(body.mod) === 'denge' ? 'denge' : 'hazirla'
    if (!studentId) return json({ error: 'Öğrenci seçimi gerekli.' }, 400)

    const { data: coaching, error: coachingError } = await client
      .from('kocluk_ogrenci_profilleri')
      .select('ogrenci_id,sinav_turu,hedef_puan,hedef_siralama,haftalik_calisma_yogunlugu,pazar_calisma')
      .eq('ogrenci_id', studentId)
      .eq('durum', 'Aktif')
      .maybeSingle()
    if (coachingError || !coaching) return json({ error: 'Bu öğrenci için koçluk erişiminiz yok.' }, 403)

    const today = istanbulToday()
    const planEnd = addDays(today, 6)
    const intensity = ['Hafif', 'Normal', 'Yoğun'].includes(compact(coaching.haftalik_calisma_yogunlugu))
      ? compact(coaching.haftalik_calisma_yogunlugu)
      : 'Normal'
    const sundayWork = coaching.pazar_calisma !== false
    const allowedDates = Array.from({ length: 7 }, (_, index) => addDays(today, index))
      .filter(date => sundayWork || dayName(date).toLocaleLowerCase('tr-TR') !== 'pazar')

    const [assignmentsResult, booksResult, meetingsResult, examsResult] = await Promise.all([
      client.from('odevler')
        .select('odev_id,ogrenci_id,odev_basligi,verilis_tarihi,son_teslim_tarihi,durum,tamamlanma_tarihi,ogrenci_kitap_id,calisma_turu,baslangic_no,bitis_no')
        .eq('ogrenci_id', studentId)
        .order('verilis_tarihi', { ascending: false }),
      client.from('ogrenci_kitaplari')
        .select('ogrenci_kitap_id,kitap_id,durum')
        .eq('ogrenci_id', studentId)
        .eq('durum', 'Aktif'),
      client.from('kocluk_gorusmeleri')
        .select('gorusme_tarihi,durum,alinan_kararlar')
        .eq('ogrenci_id', studentId)
        .neq('durum', 'İptal')
        .order('gorusme_tarihi', { ascending: false })
        .limit(3),
      client.from('kocluk_deneme_sinavlari')
        .select('deneme_id,sinav_turu,deneme_adi,deneme_tarihi,onay_durumu')
        .eq('ogrenci_id', studentId)
        .neq('onay_durumu', 'İptal')
        .order('deneme_tarihi', { ascending: false })
        .limit(3),
    ])

    if (assignmentsResult.error) return json({ error: 'Çalışma geçmişi okunamadı.' }, 500)
    if (booksResult.error) return json({ error: 'Öğrenci kitapları okunamadı.' }, 500)

    const assignments = assignmentsResult.data || []
    const studentBooks = booksResult.data || []
    const bookIds = [...new Set(studentBooks.map((item: any) => item.kitap_id).filter(Boolean))]
    let catalog: any[] = []
    if (bookIds.length) {
      const catalogResult = await client.from('kitap_katalogu')
        .select('kitap_id,kitap_adi,yayinevi,ders,sinav_turu,toplam_sayfa,durum')
        .in('kitap_id', bookIds)
        .eq('durum', 'Onaylı')
      if (catalogResult.error) return json({ error: 'Kitap kataloğu okunamadı.' }, 500)
      catalog = catalogResult.data || []
    }

    const weekStart = addDays(today, -6)
    const dueRecent = assignments.filter((item: any) => {
      const date = compact(item.son_teslim_tarihi || item.verilis_tarihi)
      return date && date >= weekStart && date <= today && !cancelled(item.durum)
    })
    const doneRecent = dueRecent.filter((item: any) => done(item.durum))
    const weekCompletion = dueRecent.length ? Math.round((doneRecent.length / dueRecent.length) * 100) : null
    const overdue = assignments.filter((item: any) => compact(item.son_teslim_tarihi) && item.son_teslim_tarihi < today && !done(item.durum) && !cancelled(item.durum))

    const completed21Start = addDays(today, -20)
    const completedLast21 = assignments.filter((item: any) => {
      if (!done(item.durum) || cancelled(item.durum)) return false
      const date = compact(item.tamamlanma_tarihi || item.son_teslim_tarihi || item.verilis_tarihi)
      return date && date >= completed21Start && date <= today
    })
    const averageCompleted = completedLast21.length / 3
    const factor = intensity === 'Hafif' ? 0.75 : intensity === 'Yoğun' ? 1.25 : 1
    const maxNew = Math.max(1, Math.min(12, Math.round(averageCompleted * factor) || 1))

    const holdReason = overdue.length > 0
      ? `${overdue.length} geciken çalışma varken yeni yük önermek yerine mevcut planın toparlanması daha doğru.`
      : dueRecent.length >= 3 && weekCompletion != null && weekCompletion < 65
        ? `Son 7 günlük tamamlama oranı %${weekCompletion}. Yeni yük eklemek yerine mevcut planı dengelemek daha doğru.`
        : null

    const candidates: Candidate[] = []
    let candidateNo = 1
    const chunksPerBook = intensity === 'Hafif' ? 1 : intensity === 'Yoğun' ? 3 : 2

    if (!holdReason) {
      for (const link of studentBooks as any[]) {
        const openForBook = assignments.some((item: any) => item.ogrenci_kitap_id === link.ogrenci_kitap_id && !done(item.durum) && !cancelled(item.durum))
        if (openForBook) continue

        const history = assignments
          .filter((item: any) => item.ogrenci_kitap_id === link.ogrenci_kitap_id
            && done(item.durum)
            && ['Sayfa', 'Test'].includes(compact(item.calisma_turu))
            && Number(item.baslangic_no) > 0
            && Number(item.bitis_no) >= Number(item.baslangic_no))
          .sort((a: any, b: any) => compact(b.tamamlanma_tarihi || b.son_teslim_tarihi || b.verilis_tarihi).localeCompare(compact(a.tamamlanma_tarihi || a.son_teslim_tarihi || a.verilis_tarihi)))
        const last = history[0]
        if (!last) continue

        const book = catalog.find((item: any) => item.kitap_id === link.kitap_id)
        if (!book) continue
        const type = compact(last.calisma_turu) as 'Sayfa' | 'Test'
        const spans = history.slice(0, 3).map((item: any) => Number(item.bitis_no) - Number(item.baslangic_no) + 1).filter((value: number) => value > 0)
        const baseSpan = Math.max(1, Math.round(spans.reduce((sum: number, value: number) => sum + value, 0) / Math.max(spans.length, 1)))
        const adjustedSpan = Math.max(1, Math.round(baseSpan * factor))
        let start = Number(last.bitis_no) + 1
        const maxNo = type === 'Sayfa' && Number(book.toplam_sayfa) > 0 ? Number(book.toplam_sayfa) : null

        for (let chunk = 0; chunk < chunksPerBook; chunk++) {
          if (maxNo != null && start > maxNo) break
          const end = maxNo != null ? Math.min(start + adjustedSpan - 1, maxNo) : start + adjustedSpan - 1
          if (end < start) break
          candidates.push({
            id: `C${candidateNo++}`,
            studentBookId: link.ogrenci_kitap_id,
            bookName: compact(book.kitap_adi) || 'Aktif kitap',
            bookMeta: [compact(book.ders), compact(book.yayinevi)].filter(Boolean).join(' · '),
            subject: compact(book.ders),
            type,
            startNo: start,
            endNo: end,
            maxNo,
            history: `Son gerçek çalışma ${last.baslangic_no}–${last.bitis_no}; son üç çalışmanın ortalama aralığı ${baseSpan}.`,
          })
          start = end + 1
        }
      }
    }

    const exams = examsResult.data || []
    let examContext: Array<{ sinav_turu: string; tarih: string; bolumler: Array<{ bolum: string; net: number }> }> = []
    const examIds = exams.map((item: any) => item.deneme_id).filter(Boolean)
    if (examIds.length) {
      const sectionsResult = await client.from('kocluk_deneme_bolum_sonuclari')
        .select('deneme_id,bolum_adi,net')
        .in('deneme_id', examIds)
      if (!sectionsResult.error) {
        examContext = exams.map((exam: any) => ({
          sinav_turu: compact(exam.sinav_turu),
          tarih: compact(exam.deneme_tarihi),
          bolumler: (sectionsResult.data || [])
            .filter((row: any) => row.deneme_id === exam.deneme_id && row.net != null)
            .slice(0, 12)
            .map((row: any) => ({ bolum: compact(row.bolum_adi), net: Number(row.net) })),
        }))
      }
    }

    const meetingContext = (meetingsResult.data || [])
      .filter((item: any) => compact(item.alinan_kararlar))
      .slice(0, 2)
      .map((item: any) => ({ tarih: compact(item.gorusme_tarihi), karar: clampText(item.alinan_kararlar, 280) }))

    const planId = `AIP-${today.replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const openThisWindow = assignments.filter((item: any) => {
      const due = compact(item.son_teslim_tarihi)
      return !done(item.durum) && !cancelled(item.durum) && due && due >= today && due <= planEnd
    }).map((item: any) => ({ tarih: item.son_teslim_tarihi, baslik: clampText(item.odev_basligi, 120) }))

    let aiPlan = fallbackPlan(candidates, allowedDates, Math.min(maxNew, candidates.length), holdReason)
    let aiActive = false
    let model = ''

    const openAiKey = Deno.env.get('OPENAI_API_KEY') || ''
    if (openAiKey && !holdReason && candidates.length && allowedDates.length) {
      model = Deno.env.get('OPENAI_WEEKLY_PLAN_MODEL') || 'gpt-5.6-luna'
      const safeCandidates = candidates.map(({ id, bookName, bookMeta, subject, type, startNo, endNo, history }) => ({ id, kitap: bookName, meta: bookMeta, ders: subject, tur: type, baslangic: startNo, bitis: endNo, gecmis: history }))
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: 1800,
          input: [
            {
              role: 'system',
              content: [{
                type: 'input_text',
                text: [
                  'Bir eğitim koçunun haftalık çalışma planı yardımcısısın.',
                  'Yalnız verilen ADAY kimliklerinden çalışma seçebilirsin. Yeni kitap, ders, konu, sayfa, test veya çalışma aralığı UYDURMA.',
                  'Adayın başlangıç ve bitiş aralığını değiştirme. Yalnız izinli tarihlerden birini seç.',
                  'Mevcut açık çalışmaları dikkate al ve aynı güne gereksiz yığılma yapma.',
                  'Deneme verisini yalnız öncelik sinyali olarak kullan; neden-sonuç iddiası kurma.',
                  'Görüşme kararını planın bağlamı olarak kullan; aday listesinde olmayan yeni görev üretme.',
                  'Öğrencinin gerçek son 21 günlük tamamlama kapasitesini aşma. Daha az görev seçmek serbesttir.',
                  'Çıktı kısa, uygulanabilir ve Türkçe olsun. Kişisel veri isteme veya üretme.',
                ].join(' '),
              }],
            },
            {
              role: 'user',
              content: [{
                type: 'input_text',
                text: JSON.stringify({
                  mod: mode,
                  donem: { baslangic: today, bitis: planEnd, izinli_tarihler: allowedDates },
                  ayar: { yogunluk: intensity, pazar_calisma: sundayWork },
                  kapasite: { son_21_gun_tamamlanan: completedLast21.length, haftalik_hedef_ust_sinir: Math.min(maxNew, candidates.length), son_7_gun_tamamlama_yuzdesi: weekCompletion },
                  mevcut_acik_plan: openThisWindow,
                  adaylar: safeCandidates,
                  denemeler: examContext,
                  son_gorusme_kararlari: meetingContext,
                }),
              }],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'kocluk_ai_haftalik_plan',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  baslik: { type: 'string' },
                  ozet: { type: 'string' },
                  odaklar: { type: 'array', maxItems: 3, items: { type: 'string' } },
                  secimler: {
                    type: 'array',
                    maxItems: 12,
                    items: {
                      type: 'object', additionalProperties: false,
                      properties: { aday_id: { type: 'string' }, tarih: { type: 'string' }, gerekce: { type: 'string' } },
                      required: ['aday_id', 'tarih', 'gerekce'],
                    },
                  },
                  uyarilar: { type: 'array', maxItems: 5, items: { type: 'string' } },
                },
                required: ['baslik', 'ozet', 'odaklar', 'secimler', 'uyarilar'],
              },
            },
          },
        }),
        signal: AbortSignal.timeout(25000),
      })

      if (response.ok) {
        const payload = await response.json()
        const output = extractOutputText(payload)
        if (output) {
          try {
            const parsed = JSON.parse(output) as AiPlan
            const seen = new Set<string>()
            const validSelections = (Array.isArray(parsed.secimler) ? parsed.secimler : [])
              .filter(item => candidates.some(candidate => candidate.id === compact(item.aday_id)))
              .filter(item => allowedDates.includes(compact(item.tarih)))
              .filter(item => !seen.has(compact(item.aday_id)) && seen.add(compact(item.aday_id)))
              .slice(0, Math.min(maxNew, 12))
            aiPlan = {
              baslik: clampText(parsed.baslik, 120) || 'Bu haftanın çalışma planı',
              ozet: clampText(parsed.ozet, 420) || 'Plan gerçek çalışma geçmişine göre hazırlandı.',
              odaklar: (Array.isArray(parsed.odaklar) ? parsed.odaklar : []).map(item => clampText(item, 90)).filter(Boolean).slice(0, 3),
              secimler: validSelections.map(item => ({ aday_id: compact(item.aday_id), tarih: compact(item.tarih), gerekce: clampText(item.gerekce, 220) })),
              uyarilar: (Array.isArray(parsed.uyarilar) ? parsed.uyarilar : []).map(item => clampText(item, 160)).filter(Boolean).slice(0, 5),
            }
            aiActive = true
          } catch (error) {
            console.error('kocluk-ai-haftalik-plan-v2 JSON', error)
          }
        }
      } else {
        console.error('kocluk-ai-haftalik-plan-v2 OpenAI', response.status, (await response.text().catch(() => '')).slice(0, 700))
      }
    }

    const selected = aiPlan.secimler.map(item => {
      const candidate = candidates.find(row => row.id === item.aday_id)!
      return {
        id: `${planId}:${candidate.id}`,
        candidate_id: candidate.id,
        ogrenci_kitap_id: candidate.studentBookId,
        kitap_adi: candidate.bookName,
        kitap_meta: candidate.bookMeta,
        ders: candidate.subject,
        calisma_turu: candidate.type,
        baslangic_no: candidate.startNo,
        bitis_no: candidate.endNo,
        max_no: candidate.maxNo,
        son_teslim_tarihi: item.tarih,
        gerekce: item.gerekce || candidate.history,
      }
    })

    return json({
      basarili: true,
      aktif: aiActive,
      model: aiActive ? model : null,
      durum: holdReason ? 'mevcut_plani_koru' : candidates.length ? (aiActive ? 'ai_hazir' : 'guvenli_yedek') : 'ilk_calisma_gerekli',
      plan: {
        plan_id: planId,
        baslangic: today,
        bitis: planEnd,
        yogunluk: intensity,
        pazar_calisma: sundayWork,
        baslik: aiPlan.baslik,
        ozet: aiPlan.ozet,
        odaklar: aiPlan.odaklar,
        uyarilar: aiPlan.uyarilar,
        son_7_gun_tamamlama_yuzdesi: weekCompletion,
        geciken: overdue.length,
        son_21_gun_tamamlanan: completedLast21.length,
        max_yeni_calisma: maxNew,
        maddeler: selected,
      },
    })
  } catch (error) {
    console.error('kocluk-ai-haftalik-plan-v2', error)
    return json({ basarili: false, error: 'AI haftalık plan hazırlanamadı.' }, 500)
  }
})
