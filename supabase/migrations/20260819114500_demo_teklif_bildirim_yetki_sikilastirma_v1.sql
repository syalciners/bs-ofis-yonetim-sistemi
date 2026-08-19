-- BS Eğitim Demo
-- Teklif bildirimi yardımcı RPC'leri yalnız sunucu/servis katmanına kapatılır.
-- Ziyaretçinin doğrudan kullandığı demo RPC'leri değiştirilmez.

revoke execute on function public.demo_oturum_kaynak_guncelle_v1(text,text,text,text,text,text,text) from anon;

revoke execute on function public.demo_teklif_bildirim_baslat_v1(uuid) from authenticated;
revoke execute on function public.demo_teklif_bildirim_verisi_v1(uuid) from authenticated;
revoke execute on function public.demo_teklif_bildirim_sonuc_v1(uuid,boolean,text) from authenticated;
revoke execute on function public.demo_teklif_bildirim_sonucu_v1(uuid,boolean,text) from anon, authenticated;
