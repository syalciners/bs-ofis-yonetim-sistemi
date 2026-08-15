import { supabase } from '../lib/supabase'
import type { AppData, Ders, Ogrenci, Ogretmen, SabitProgram } from '../lib/types'
import { uid } from '../lib/format'

const ensure = <T>(result: { data: T | null; error: any }, label: string): T => {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return (result.data ?? []) as T
}

export async function loadAppData(): Promise<AppData> {
  const [ogr, ogt, br, ob, ds, sp, ders, tah, gid, gk, oo, hd, kh, khar, od] = await Promise.all([
    supabase.from('ogrenciler').select('*').order('ad_soyad'),
    supabase.from('ogretmenler').select('*').order('ad_soyad'),
    supabase.from('branslar').select('*').order('brans_adi'),
    supabase.from('ogretmen_branslari').select('*'),
    supabase.from('derslikler').select('*').order('mekan_adi'),
    supabase.from('sabit_ders_programi').select('*'),
    supabase.from('dersler').select('*').order('tarih', { ascending: false }).order('baslangic_saati', { ascending: false }),
    supabase.from('tahsilatlar').select('*').order('tarih', { ascending: false }).order('olusturulma_zamani', { ascending: false }),
    supabase.from('giderler').select('*').order('tarih', { ascending: false }),
    supabase.from('gider_kategorileri').select('*').order('sira_no'),
    supabase.from('ogretmen_odemeleri').select('*').order('tarih', { ascending: false }),
    supabase.from('hakedis_donemleri').select('*').order('baslangic_tarihi', { ascending: false }),
    supabase.from('kasa_hesaplari').select('*').order('hesap_adi'),
    supabase.from('kasa_hareketleri').select('*').order('tarih', { ascending: false }).order('olusturulma_zamani', { ascending: false }),
    supabase.from('odevler').select('*').order('verilis_tarihi', { ascending: false }),
  ])

  return {
    ogrenciler: ensure<any[]>(ogr, 'Öğrenciler'),
    ogretmenler: ensure<any[]>(ogt, 'Öğretmenler'),
    branslar: ensure<any[]>(br, 'Branşlar'),
    ogretmenBranslari: ensure<any[]>(ob, 'Öğretmen branşları'),
    derslikler: ensure<any[]>(ds, 'Derslikler'),
    sabitProgramlar: ensure<any[]>(sp, 'Sabit program'),
    dersler: ensure<any[]>(ders, 'Dersler'),
    tahsilatlar: ensure<any[]>(tah, 'Tahsilatlar'),
    giderler: ensure<any[]>(gid, 'Giderler'),
    giderKategorileri: ensure<any[]>(gk, 'Gider kategorileri'),
    ogretmenOdemeleri: ensure<any[]>(oo, 'Öğretmen ödemeleri'),
    hakedisDonemleri: ensure<any[]>(hd, 'Hakediş dönemleri'),
    kasaHesaplari: ensure<any[]>(kh, 'Kasa hesapları'),
    kasaHareketleri: ensure<any[]>(khar, 'Kasa hareketleri'),
    odevler: ensure<any[]>(od, 'Ödevler'),
  }
}

export async function loadProfile(userId: string) {
  const r = await supabase.from('kullanici_profilleri').select('*').eq('auth_user_id', userId).maybeSingle()
  if (r.error) throw r.error
  return r.data
}

export async function setLessonStatus(dersId: string, status: string, note?: string) {
  const { error } = await supabase.rpc('ders_durumu_guncelle_guvenli_v1', { p_ders_id: dersId, p_yeni_durum: status, p_aciklama: note || null })
  if (error) throw error
}

export async function saveLesson(input: {
  ders_id?: string; tarih: string; ogrenci_id: string; ogretmen_id: string; brans_id: string; derslik_id: string;
  baslangic_saati: string; ders_sayisi: number; aciklama?: string | null; program_id?: string | null;
  ogrenci_birim_ucreti: number; ogretmen_birim_hakedisi: number;
}) {
  const { error } = await supabase.rpc('ders_kaydet_guvenli_v1', {
    p_ders_id: input.ders_id || uid('DRS'), p_tarih: input.tarih, p_ogrenci_id: input.ogrenci_id,
    p_ogretmen_id: input.ogretmen_id, p_brans_id: input.brans_id, p_derslik_id: input.derslik_id,
    p_baslangic_saati: input.baslangic_saati, p_ders_sayisi: input.ders_sayisi, p_aciklama: input.aciklama || null,
    p_program_id: input.program_id || null, p_ogrenci_birim_ucreti: input.ogrenci_birim_ucreti,
    p_ogretmen_birim_hakedisi: input.ogretmen_birim_hakedisi,
  })
  if (error) throw error
}

export async function updateLesson(input: {
  ders_id: string; tarih: string; ogrenci_id: string; ogretmen_id: string; brans_id: string; derslik_id: string;
  baslangic_saati: string; ders_sayisi: number; ogrenci_birim_ucreti: number; ogretmen_birim_hakedisi: number; aciklama?: string | null;
}) {
  const { error } = await supabase.rpc('ders_guncelle_guvenli_v1', {
    p_ders_id: input.ders_id, p_tarih: input.tarih, p_ogrenci_id: input.ogrenci_id, p_ogretmen_id: input.ogretmen_id,
    p_brans_id: input.brans_id, p_derslik_id: input.derslik_id, p_baslangic_saati: input.baslangic_saati,
    p_ders_sayisi: input.ders_sayisi, p_ogrenci_birim_ucreti: input.ogrenci_birim_ucreti,
    p_ogretmen_birim_hakedisi: input.ogretmen_birim_hakedisi, p_aciklama: input.aciklama || null,
  })
  if (error) throw error
}

export async function lessonConflict(input: { tarih: string; ogrenci_id: string; ogretmen_id: string; derslik_id: string; baslangic_saati: string; ders_sayisi: number; haric_ders_id?: string | null }) {
  const { data, error } = await supabase.rpc('ders_cakisma_kontrol_v1', {
    p_tarih: input.tarih, p_ogrenci_id: input.ogrenci_id, p_ogretmen_id: input.ogretmen_id,
    p_derslik_id: input.derslik_id, p_baslangic_saati: input.baslangic_saati, p_ders_sayisi: input.ders_sayisi,
    p_haric_ders_id: input.haric_ders_id || null,
  })
  if (error) throw error
  return data as { uygun: boolean; mesaj?: string; [key: string]: unknown }
}

export async function createWeek(monday: string) {
  const { data, error } = await supabase.rpc('haftalik_dersleri_olustur_guvenli_v4', { p_hafta_baslangici: monday })
  if (error) throw error
  return data
}

export type WeekCreationStatus = {
  calisti: boolean
  hafta_baslangici?: string
  gecis_kilidi?: boolean
  beklenen?: number
  mevcut?: number
  eksik?: number
  olusturulan?: number
  zaten_mevcut?: number
}

export async function getWeekCreationStatus(monday: string): Promise<WeekCreationStatus> {
  const { data, error } = await supabase.rpc('haftalik_ders_uretim_durumu_v1', { p_hafta_baslangici: monday })
  if (error) throw error
  return data as WeekCreationStatus
}

export async function saveStudent(input: Partial<Ogrenci> & { ad_soyad: string; ogrenci_id?: string }) {
  const id = input.ogrenci_id || uid('OGR')
  if (input.ogrenci_id) {
    const { error } = await supabase.rpc('ogrenci_kaydet_guvenli_v2', {
      p_ogrenci_id: id, p_ad_soyad: input.ad_soyad, p_veli_adi: input.veli_adi || null,
      p_veli_telefon: input.veli_telefon || null, p_ogrenci_telefon: input.ogrenci_telefon || null,
      p_email: input.email || null, p_kayit_tarihi: input.kayit_tarihi || null, p_notlar: input.notlar || null,
      p_durum: input.durum || 'Aktif',
    })
    if (error) throw error
  } else {
    const { error } = await supabase.rpc('ogrenci_ekle_guvenli_v1', {
      p_ogrenci_id: id, p_ad_soyad: input.ad_soyad, p_veli_adi: input.veli_adi || null,
      p_veli_telefon: input.veli_telefon || null, p_ogrenci_telefon: input.ogrenci_telefon || null,
      p_email: input.email || null, p_kayit_tarihi: input.kayit_tarihi || null, p_notlar: input.notlar || null,
    })
    if (error) throw error
  }
  return id
}

export async function saveTeacher(input: Partial<Ogretmen> & { ad_soyad: string; ogretmen_id?: string }, branchIds: string[]) {
  const id = input.ogretmen_id || uid('OGT')
  const { error } = await supabase.rpc('ogretmen_kaydet_guvenli_v5', {
    p_ogretmen_id: id, p_ad_soyad: input.ad_soyad, p_brans_ids: branchIds,
    p_telefon: input.telefon || null, p_email: input.email || null, p_notlar: input.notlar || null,
    p_durum: input.durum || 'Aktif',
  })
  if (error) throw error
  return id
}

export async function saveCollection(input: { ogrenci_id: string; tutar: number; tarih: string; odeme_yontemi: string; aciklama?: string | null }) {
  const { error } = await supabase.rpc('tahsilat_kaydet_guvenli_v1', {
    p_tahsilat_id: uid('TAH'), p_hareket_id: uid('KH'), p_tarih: input.tarih,
    p_ogrenci_id: input.ogrenci_id, p_tutar: input.tutar, p_odeme_yontemi: input.odeme_yontemi,
    p_aciklama: input.aciklama || null,
  })
  if (error) throw error
}

export async function saveExpense(input: { kategori_id: string; tutar: number; tarih: string; odeme_yontemi: string; aciklama?: string | null; hesap_id?: string | null }) {
  const { error } = await supabase.rpc('gider_kaydet_guvenli_v1', {
    p_gider_id: uid('GID'), p_hareket_id: uid('KH'), p_tarih: input.tarih, p_kategori_id: input.kategori_id,
    p_tutar: input.tutar, p_odeme_yontemi: input.odeme_yontemi, p_aciklama: input.aciklama || null,
    p_hesap_id: input.hesap_id || null,
  })
  if (error) throw error
}

export async function saveTeacherPayment(input: { ogretmen_id: string; hakedis_donemi_id: string; tutar: number; tarih: string; odeme_yontemi: string; aciklama?: string | null; hesap_id?: string | null }) {
  const { error } = await supabase.rpc('ogretmen_odeme_kaydet_guvenli_v2', {
    p_odeme_id: uid('OOD'), p_hareket_id: uid('KH'), p_tarih: input.tarih,
    p_hakedis_donemi_id: input.hakedis_donemi_id, p_ogretmen_id: input.ogretmen_id,
    p_tutar: input.tutar, p_odeme_yontemi: input.odeme_yontemi, p_aciklama: input.aciklama || null,
    p_hesap_id: input.hesap_id || null,
  })
  if (error) throw error
}

export async function saveProgram(input: SabitProgram) {
  const { error } = await supabase.rpc('sabit_program_kaydet_guvenli_v2', {
    p_program_id: input.program_id || uid('SP'), p_ogrenci_id: input.ogrenci_id, p_ogretmen_id: input.ogretmen_id,
    p_brans_id: input.brans_id, p_derslik_id: input.derslik_id, p_haftanin_gunu: input.haftanin_gunu,
    p_baslangic_saati: input.baslangic_saati, p_ders_sayisi: Number(input.ders_sayisi || 1),
    p_ogrenci_birim_ucreti: Number(input.ogrenci_birim_ucreti || 0), p_ogretmen_birim_hakedisi: Number(input.ogretmen_birim_hakedisi || 0),
    p_tekrar_sikligi: input.tekrar_sikligi || 'Her Hafta', p_baslangic_tarihi: input.baslangic_tarihi || null,
    p_bitis_tarihi: input.bitis_tarihi || null, p_aciklama: input.aciklama || null, p_program_durumu: input.program_durumu || 'Aktif',
  })
  if (error) throw error
}

export async function programConflict(input: SabitProgram) {
  const { data, error } = await supabase.rpc('sabit_program_cakisma_kontrol_v1', {
    p_ogrenci_id: input.ogrenci_id, p_ogretmen_id: input.ogretmen_id, p_derslik_id: input.derslik_id,
    p_haftanin_gunu: input.haftanin_gunu, p_baslangic_saati: input.baslangic_saati, p_ders_sayisi: Number(input.ders_sayisi || 1),
    p_tekrar_sikligi: input.tekrar_sikligi || 'Her Hafta', p_baslangic_tarihi: input.baslangic_tarihi || null,
    p_bitis_tarihi: input.bitis_tarihi || null, p_haric_program_id: input.program_id || null,
  })
  if (error) throw error
  return data as { uygun: boolean; mesaj?: string; [key: string]: unknown }
}

export async function previewProgram(programId: string, start: string, count = 10) {
  const { data, error } = await supabase.rpc('sabit_program_onizleme_v1', { p_program_id: programId, p_baslangic: start, p_adet: count })
  if (error) throw error
  return data
}

export async function skipProgramDate(programId: string, date: string, note?: string) {
  const { error } = await supabase.rpc('sabit_program_hafta_atla_guvenli_v1', { p_program_id: programId, p_tarih: date, p_aciklama: note || null })
  if (error) throw error
}

export async function moveProgramDate(input: { program_id: string; orijinal_tarih: string; yeni_tarih: string; yeni_baslangic_saati: string; yeni_derslik_id: string; aciklama?: string | null }) {
  const { error } = await supabase.rpc('sabit_program_tek_sefer_tasi_guvenli_v1', {
    p_program_id: input.program_id, p_orijinal_tarih: input.orijinal_tarih, p_yeni_tarih: input.yeni_tarih,
    p_yeni_baslangic_saati: input.yeni_baslangic_saati, p_yeni_derslik_id: input.yeni_derslik_id,
    p_aciklama: input.aciklama || null,
  })
  if (error) throw error
}

export async function healthCheck() {
  const [system, program] = await Promise.all([
    supabase.rpc('sistem_saglik_kontrolu_v1'),
    supabase.rpc('program_saglik_kontrolu_v1'),
  ])
  if (system.error) throw system.error
  if (program.error) throw program.error
  return { system: system.data, program: program.data }
}

export function subscribeToChanges(onChange: () => void) {
  const channel = supabase.channel('bs-ofis-live')
  const tables = ['ogrenciler','ogretmenler','sabit_ders_programi','dersler','tahsilatlar','giderler','ogretmen_odemeleri','kasa_hareketleri','odevler']
  tables.forEach((table) => channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange))
  channel.subscribe()
  return () => { void supabase.removeChannel(channel) }
}

export const getProgramForLesson = (lesson: Ders, programs: SabitProgram[]) => lesson.program_id ? programs.find(p => p.program_id === lesson.program_id) : undefined

export async function saveAssignment(input: {
  odev_id?: string; ogrenci_id: string; ogretmen_id: string; konu: string; aciklama?: string | null;
  verilis_tarihi: string; son_teslim_tarihi?: string | null; ders_id?: string | null; oncelik?: string | null;
}) {
  const { error } = await supabase.rpc('odev_kaydet_guvenli_v1', {
    p_odev_id: input.odev_id || uid('ODV'), p_ogrenci_id: input.ogrenci_id, p_ogretmen_id: input.ogretmen_id,
    p_konu: input.konu, p_aciklama: input.aciklama || null, p_verilis_tarihi: input.verilis_tarihi,
    p_son_teslim_tarihi: input.son_teslim_tarihi || null, p_ders_id: input.ders_id || null,
    p_oncelik: input.oncelik || 'Normal',
  })
  if (error) throw error
}

export async function updateAssignmentStatus(odevId: string, durum: string, teacherNote?: string | null, score?: string | null) {
  const { error } = await supabase.rpc('odev_durumu_guncelle_guvenli_v1', {
    p_odev_id: odevId, p_durum: durum, p_ogretmen_notu: teacherNote || null, p_puan: score || null,
  })
  if (error) throw error
}
