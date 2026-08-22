import { supabase } from '../lib/supabase'
import type { MdDers, MdDersKatilim, MdKursiyerBakiye, MdTahsilat } from './types'

const fail = (label: string, error: { message?: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message || 'Bilinmeyen hata'}`)
}

export interface MdKursiyerDersGecmisi {
  ders: MdDers
  katilim: MdDersKatilim
}

export interface MdKursiyerDetayVerisi {
  bakiye: MdKursiyerBakiye | null
  tahsilatlar: MdTahsilat[]
  dersGecmisi: MdKursiyerDersGecmisi[]
}

export async function mdKursiyerDetayGetir(kurumId: string, kursiyerId: string): Promise<MdKursiyerDetayVerisi> {
  const [bakiye, tahsilatlar, katilimlar] = await Promise.all([
    supabase
      .from('md_kursiyer_bakiyeleri')
      .select('*')
      .eq('kurum_id', kurumId)
      .eq('kursiyer_id', kursiyerId)
      .maybeSingle(),
    supabase
      .from('md_tahsilatlar')
      .select('*')
      .eq('kurum_id', kurumId)
      .eq('kursiyer_id', kursiyerId)
      .eq('durum', 'Aktif')
      .order('tarih', { ascending: false })
      .limit(20),
    supabase
      .from('md_ders_katilimlari')
      .select('*')
      .eq('kurum_id', kurumId)
      .eq('kursiyer_id', kursiyerId)
      .limit(200),
  ])

  fail('Kursiyer bakiyesi alınamadı', bakiye.error)
  fail('Kursiyer tahsilatları alınamadı', tahsilatlar.error)
  fail('Kursiyer ders katılımları alınamadı', katilimlar.error)

  const attendanceRows = (katilimlar.data || []) as MdDersKatilim[]
  const lessonIds = [...new Set(attendanceRows.map(x => x.ders_id).filter(Boolean))]
  let lessons: MdDers[] = []

  if (lessonIds.length) {
    const lessonResult = await supabase
      .from('md_dersler')
      .select('*')
      .eq('kurum_id', kurumId)
      .in('ders_id', lessonIds)
      .order('tarih', { ascending: false })
      .order('baslangic_saati', { ascending: false })
      .limit(200)
    fail('Kursiyer ders geçmişi alınamadı', lessonResult.error)
    lessons = (lessonResult.data || []) as MdDers[]
  }

  const attendanceByLesson = new Map(attendanceRows.map(x => [x.ders_id, x]))
  const dersGecmisi = lessons
    .map(ders => ({ ders, katilim: attendanceByLesson.get(ders.ders_id) }))
    .filter((x): x is MdKursiyerDersGecmisi => Boolean(x.katilim))

  const balanceRow = bakiye.data as MdKursiyerBakiye | null
  return {
    bakiye: balanceRow ? {
      ...balanceRow,
      toplam_borc: Number(balanceRow.toplam_borc || 0),
      toplam_tahsilat: Number(balanceRow.toplam_tahsilat || 0),
      bakiye: Number(balanceRow.bakiye || 0),
    } : null,
    tahsilatlar: (tahsilatlar.data || []).map((x: any) => ({ ...x, tutar: Number(x.tutar || 0) })) as MdTahsilat[],
    dersGecmisi,
  }
}
