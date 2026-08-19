import { createClient } from 'npm:@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type OpenLibraryDoc = {
  key?: string
  title?: string
  publisher?: string[]
  isbn?: string[]
  cover_i?: number
  first_publish_year?: number
  number_of_pages_median?: number
}

type BookResult = {
  kaynak: 'Open Library'
  kaynak_id: string
  kitap_adi: string
  yayinevi: string | null
  isbn: string | null
  kapak_url: string | null
  yayin_yili: number | null
  toplam_sayfa_onerisi: number | null
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
})

function cleanIsbn(value?: string | null) {
  const v = String(value || '').replace(/[^0-9Xx]/g, '').toUpperCase()
  return v.length === 10 || v.length === 13 ? v : null
}

function pickIsbn(values?: string[]) {
  const clean = (values || []).map(cleanIsbn).filter(Boolean) as string[]
  return clean.find(x => x.length === 13) || clean.find(x => x.length === 10) || null
}

function asciiTurkish(value: string) {
  return value
    .replaceAll('ı', 'i').replaceAll('İ', 'I')
    .replaceAll('ş', 's').replaceAll('Ş', 'S')
    .replaceAll('ğ', 'g').replaceAll('Ğ', 'G')
    .replaceAll('ü', 'u').replaceAll('Ü', 'U')
    .replaceAll('ö', 'o').replaceAll('Ö', 'O')
    .replaceAll('ç', 'c').replaceAll('Ç', 'C')
}

async function openLibrarySearch(searchText: string, limit: number): Promise<OpenLibraryDoc[]> {
  const digits = searchText.replace(/[^0-9Xx]/g, '')
  const isbnQuery = (digits.length === 10 || digits.length === 13) && digits.length === searchText.replace(/\s+/g, '').length
  const q = isbnQuery ? `isbn:${digits}` : searchText
  const fields = 'key,title,publisher,isbn,cover_i,first_publish_year,number_of_pages_median'
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&limit=${limit}&lang=tr`
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'BS-Egitim-Kitap-Arama/1.0',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`Open Library yanıt vermedi (${response.status}).`)
  const payload = await response.json() as { docs?: OpenLibraryDoc[] }
  return Array.isArray(payload.docs) ? payload.docs : []
}

function mapResults(docs: OpenLibraryDoc[], limit: number): BookResult[] {
  const seen = new Set<string>()
  const result: BookResult[] = []
  for (const doc of docs) {
    const title = String(doc.title || '').trim()
    if (!title) continue
    const publisher = Array.isArray(doc.publisher) ? String(doc.publisher[0] || '').trim() || null : null
    const isbn = pickIsbn(doc.isbn)
    const key = isbn || `${title.toLocaleLowerCase('tr-TR')}|${publisher || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({
      kaynak: 'Open Library',
      kaynak_id: String(doc.key || key),
      kitap_adi: title,
      yayinevi: publisher,
      isbn,
      kapak_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      yayin_yili: Number.isFinite(doc.first_publish_year) ? Number(doc.first_publish_year) : null,
      toplam_sayfa_onerisi: Number.isFinite(doc.number_of_pages_median) ? Number(doc.number_of_pages_median) : null,
    })
    if (result.length >= limit) break
  }
  return result
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

    const body = await req.json().catch(() => ({})) as { query?: unknown; limit?: unknown }
    const query = String(body.query || '').trim().replace(/\s+/g, ' ')
    const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 12)

    if (query.length < 2) return json({ error: 'Arama için en az 2 karakter yazın.' }, 400)
    if (query.length > 120) return json({ error: 'Arama metni çok uzun.' }, 400)

    let docs = await openLibrarySearch(query, limit)
    const ascii = asciiTurkish(query)
    if (docs.length === 0 && ascii !== query) docs = await openLibrarySearch(ascii, limit)

    return json({
      basarili: true,
      kaynak: 'Open Library',
      query,
      sonuclar: mapResults(docs, limit),
    })
  } catch (error) {
    console.error('kitap-arama-v1', error)
    return json({ error: error instanceof Error ? error.message : 'Kitap araması yapılamadı.' }, 502)
  }
})
