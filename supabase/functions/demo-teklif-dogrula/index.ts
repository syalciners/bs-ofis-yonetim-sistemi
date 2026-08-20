import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Yalnız POST desteklenir." }, 405);

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Yetkilendirme gerekli." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Demo yapılandırması eksik." }, 500);

  let talepId = "";
  try {
    const body = await req.json();
    talepId = typeof body?.talep_id === "string" ? body.talep_id.trim() : "";
  } catch {
    return json({ error: "Geçersiz istek." }, 400);
  }
  if (!isUuid(talepId)) return json({ error: "Teklif talebi kimliği geçersiz." }, 400);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: "Demo oturumu doğrulanamadı." }, 401);
  if (user.is_anonymous !== true) return json({ error: "Bu işlem yalnız demo oturumunda kullanılabilir." }, 403);

  const { data: lead, error: leadError } = await admin
    .from("demo_talepleri")
    .select("talep_id,auth_user_id,ad_soyad,kurum_adi,telefon,ogrenci_sayisi,ogretmen_sayisi,notlar,utm_source,utm_medium,utm_campaign,olusturulma_zamani,bildirim_durumu")
    .eq("talep_id", talepId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (leadError) return json({ error: "Teklif talebi doğrulanamadı." }, 500);
  if (!lead) return json({ error: "Teklif talebi bulunamadı." }, 404);
  if (lead.bildirim_durumu !== "Gönderiliyor") {
    return json({ error: "Teklif talebi bildirim akışında değil." }, 409);
  }

  return json({
    valid: true,
    lead: {
      talep_id: lead.talep_id,
      ad_soyad: lead.ad_soyad,
      kurum_adi: lead.kurum_adi,
      telefon: lead.telefon,
      ogrenci_sayisi: lead.ogrenci_sayisi,
      ogretmen_sayisi: lead.ogretmen_sayisi,
      notlar: lead.notlar,
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
      olusturulma_zamani: lead.olusturulma_zamani,
    },
  });
});
