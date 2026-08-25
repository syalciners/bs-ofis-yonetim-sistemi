-- BS Eğitim SaaS V1 — Kurumdan bağımsız zorunlu başlangıç verisi
-- Öğrenci, öğretmen, finans veya ders verisi seed edilmez.

insert into public.kurum_ayarlari (
  kurum_id,
  kurum_adi,
  marka_adi,
  telefon,
  email,
  adres,
  logo_url,
  varsayilan_ders_birimi,
  takvim_baslangic_saati,
  takvim_bitis_saati
)
values (
  'ANA',
  'BS Eğitim Yönetimi',
  'BS Eğitim',
  null,
  null,
  null,
  null,
  1,
  '08:00'::time,
  '21:00'::time
)
on conflict (kurum_id) do nothing;
