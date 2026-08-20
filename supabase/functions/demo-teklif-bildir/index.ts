import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const esc = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const YONETIM_BILDIRIM_URL = "https://igmtuouhdozkgwmdxlme.supabase.co/functions/v1/demo-teklif-al";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Yalnız POST desteklenir." }, 405);

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Yetkilendirme gerekli." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Supabase yapılandırması eksik." }, 500);

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

  const leadFields = "talep_id,auth_user_id,ad_soyad,kurum_adi,telefon,ogrenci_sayisi,ogretmen_sayisi,notlar,utm_source,utm_medium,utm_campaign,olusturulma_zamani,bildirim_durumu,guncellenme_zamani";
  const { data: current, error: currentError } = await admin
    .from("demo_talepleri")
    .select(leadFields)
    .eq("talep_id", talepId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (currentError) return json({ error: "Teklif talebi okunamadı." }, 500);
  if (!current) return json({ error: "Teklif talebi bulunamadı." }, 404);
  if (current.bildirim_durumu === "Gönderildi") return json({ saved: true, notified: true, already_notified: true });
  if (current.bildirim_durumu === "Gönderiliyor") return json({ error: "Bildirim zaten işleniyor." }, 409);
  if (current.bildirim_durumu !== "Bekliyor" && current.bildirim_durumu !== "Hata") return json({ error: "Bildirim durumu geçersiz." }, 409);

  if (current.bildirim_durumu === "Hata" && current.guncellenme_zamani) {
    const lastAttempt = new Date(current.guncellenme_zamani).getTime();
    if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < 60_000) {
      return json({ error: "Bildirim yeniden denenmeden önce kısa bir süre bekleyin." }, 429);
    }
  }

  const lockTime = new Date().toISOString();
  const { data: lead, error: lockError } = await admin
    .from("demo_talepleri")
    .update({ bildirim_durumu: "Gönderiliyor", bildirim_hata_mesaji: null, guncellenme_zamani: lockTime })
    .eq("talep_id", talepId)
    .eq("auth_user_id", user.id)
    .eq("bildirim_durumu", current.bildirim_durumu)
    .select(leadFields)
    .maybeSingle();

  if (lockError) return json({ error: "Bildirim başlatılamadı." }, 500);
  if (!lead) return json({ error: "Bildirim başka bir işlem tarafından başlatıldı." }, 409);

  const mark = async (ok: boolean, message?: string) => {
    const patch = ok
      ? { bildirim_durumu: "Gönderildi", bildirim_zamani: new Date().toISOString(), bildirim_hata_mesaji: null, guncellenme_zamani: new Date().toISOString() }
      : { bildirim_durumu: "Hata", bildirim_hata_mesaji: String(message || "Bilinmeyen bildirim hatası").slice(0, 500), guncellenme_zamani: new Date().toISOString() };
    return await admin
      .from("demo_talepleri")
      .update(patch)
      .eq("talep_id", talepId)
      .eq("auth_user_id", user.id)
      .eq("bildirim_durumu", "Gönderiliyor");
  };

  const d = lead as Record<string, unknown>;

  let yonetimError = "";
  try {
    const response = await fetch(YONETIM_BILDIRIM_URL, {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ talep_id: talepId }),
    });

    if (response.ok) {
      const result = await response.json().catch(() => ({}));
      const marked = await mark(true);
      if (marked.error) {
        return json({ saved: true, notified: true, channel: "uygulama", warning: "Ana uygulama bildirimi oluşturuldu ancak demo durum kaydı güncellenemedi." }, 200);
      }
      return json({ saved: true, notified: true, channel: "uygulama", already_received: result?.already_received === true });
    }

    const detail = (await response.text()).slice(0, 400);
    yonetimError = `Ana uygulama ${response.status}: ${detail}`;
  } catch (error) {
    yonetimError = `Ana uygulama bağlantı hatası: ${error instanceof Error ? error.message : String(error)}`;
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const recipient = Deno.env.get("DEMO_TEKLIF_ALICI_EMAIL") || "bsofisyonetim@gmail.com";
  const sender = Deno.env.get("DEMO_TEKLIF_GONDEREN_EMAIL") || "BS Eğitim Demo <onboarding@resend.dev>";
  if (!resendKey) {
    const message = `${yonetimError} E-posta yedeği de yapılandırılmadı.`;
    await mark(false, message);
    return json({ saved: true, notified: false, error: "Bildirim kanalları kullanılamıyor." }, 503);
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0B1F3A">
      <h2 style="margin-bottom:4px">Yeni BS Eğitim Yönetimi teklif talebi</h2>
      <p style="color:#5b6678;margin-top:0">Demo satış hunisinden yeni bir potansiyel müşteri geldi.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Ad Soyad</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(d.ad_soyad)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Kurum</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(d.kurum_adi)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Telefon</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(d.telefon)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Öğrenci</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(d.ogrenci_sayisi || "—")}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Öğretmen</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(d.ogretmen_sayisi || "—")}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><b>Kaynak</b></td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(d.utm_source || "doğrudan")} / ${esc(d.utm_campaign || "—")}</td></tr>
        <tr><td style="padding:8px;vertical-align:top"><b>Not</b></td><td style="padding:8px">${esc(d.notlar || "—")}</td></tr>
      </table>
      <p style="font-size:12px;color:#748094">Talep ID: ${esc(d.talep_id)}</p>
      <p style="font-size:12px;color:#9a3412">Ana uygulama bildirimi yedeğe düştü: ${esc(yonetimError)}</p>
    </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: `Yeni teklif talebi · ${String(d.kurum_adi || "BS Eğitim")}`,
        html,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 400);
      const message = `${yonetimError} | Resend ${response.status}: ${detail}`;
      await mark(false, message);
      return json({ saved: true, notified: false, error: "Ana uygulama ve e-posta bildirimi gönderilemedi." }, 502);
    }

    const marked = await mark(true);
    if (marked.error) {
      return json({ saved: true, notified: true, channel: "email", fallback: true, warning: "E-posta yedeği gönderildi ancak durum kaydı güncellenemedi." }, 200);
    }
    return json({ saved: true, notified: true, channel: "email", fallback: true });
  } catch (error) {
    const emailError = error instanceof Error ? error.message : String(error);
    await mark(false, `${yonetimError} | E-posta bağlantı hatası: ${emailError}`);
    return json({ saved: true, notified: false, error: "Ana uygulama ve e-posta bildirimi gönderilemedi." }, 502);
  }
});
