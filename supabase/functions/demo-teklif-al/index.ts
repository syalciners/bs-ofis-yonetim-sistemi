import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEMO_VERIFY_URL = "https://pparlcdctnivmpiofuvz.supabase.co/functions/v1/demo-teklif-dogrula";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const clean = (value: unknown, max = 500) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Yalnız POST desteklenir." }, 405);

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Demo oturumu gerekli." }, 401);

  let talepId = "";
  try {
    const body = await req.json();
    talepId = typeof body?.talep_id === "string" ? body.talep_id.trim() : "";
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  if (!isUuid(talepId)) return json({ error: "Teklif talebi kimliği geçersiz." }, 400);

  let verifyPayload: any;
  try {
    const verifyResponse = await fetch(DEMO_VERIFY_URL, {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ talep_id: talepId }),
    });

    if (!verifyResponse.ok) {
      const detail = (await verifyResponse.text()).slice(0, 300);
      console.error("Demo teklif doğrulama reddedildi", verifyResponse.status, detail);
      return json({ error: "Demo teklif doğrulanamadı." }, verifyResponse.status >= 500 ? 502 : 403);
    }

    verifyPayload = await verifyResponse.json();
  } catch (error) {
    console.error("Demo doğrulama servisine ulaşılamadı", error);
    return json({ error: "Demo doğrulama servisine ulaşılamadı." }, 502);
  }

  const lead = verifyPayload?.lead;
  if (verifyPayload?.valid !== true || !lead || lead.talep_id !== talepId) {
    return json({ error: "Doğrulama yanıtı geçersiz." }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Ana uygulama yapılandırması eksik." }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const kurumAdi = clean(lead.kurum_adi, 160);
  const adSoyad = clean(lead.ad_soyad, 120);
  const telefon = clean(lead.telefon, 40);
  const notlar = clean(lead.notlar, 1000);
  const utmSource = clean(lead.utm_source, 100);
  const utmCampaign = clean(lead.utm_campaign, 120);

  const payload = {
    bildirim_id: talepId,
    kategori: "Satış",
    baslik: "Yeni Teklif Talebi",
    icerik: kurumAdi
      ? `${kurumAdi} için demo uygulamasından yeni teklif talebi geldi.`
      : "Demo uygulamasından yeni teklif talebi geldi.",
    oncelik: "Yüksek",
    kaynak: "BS Eğitim Demo",
    alici_turu: "Yönetici",
    alici_id: null,
    ilgili_kayit_turu: "demo_teklif",
    ilgili_kayit_id: talepId,
    eylem_yolu: null,
    meta: {
      kurum_adi: kurumAdi || null,
      ad_soyad: adSoyad || null,
      telefon: telefon || null,
      ogrenci_sayisi: lead.ogrenci_sayisi ?? null,
      ogretmen_sayisi: lead.ogretmen_sayisi ?? null,
      not: notlar || null,
      utm_source: utmSource || null,
      utm_campaign: utmCampaign || null,
      demo_talep_id: talepId,
    },
  };

  const { error: insertError } = await admin.from("bildirimler").insert(payload);
  if (insertError) {
    if (insertError.code === "23505") {
      return json({ notified: true, channel: "uygulama", already_received: true });
    }
    console.error("Ana bildirim kaydı oluşturulamadı", insertError);
    return json({ error: "Ana bildirim kaydı oluşturulamadı." }, 500);
  }

  return json({ notified: true, channel: "uygulama", already_received: false });
});
