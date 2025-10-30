import { NextResponse } from "next/server";
import { aiPolish } from "../../../lib/chat/ai";


// Internal imports
import { routeIntent } from "../../../lib/chat/intentRouter";
import { buildContext } from "../../../lib/chat/rag";
import { fallbackReply, quickReplies } from "../../../lib/chat/fallback";
import { detectDayKey, detectHoursField } from "../../../lib/chat/dates";
import { detectEventSlug, detectDietTags } from "../../../lib/chat/entities";

// 🧠 Knowledge bases
import eventsData from "../../../lib/knowledge/events.json";
import bottomlessData from "../../../lib/knowledge/bottomless.json";

export const runtime = "nodejs";


/* ============================================================
   🧠 Mini-memory (per session, in-memory, TTL = 2h)
   ============================================================ */
const MEM = new Map();
const TTL_MS = 1000 * 60 * 60 * 2;

function sessionKey(req) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "0.0.0.0";
  const ua = req.headers.get("user-agent") || "ua";
  return `${ip.split(",")[0].trim()}|${ua.slice(0, 80)}`;
}
function memSet(key, data) {
  MEM.set(key, { data, expiresAt: Date.now() + TTL_MS });
}
function memGet(key) {
  const rec = MEM.get(key);
  if (!rec) return null;
  if (Date.now() > rec.expiresAt) {
    MEM.delete(key);
    return null;
  }
  return rec.data;
}
function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/river\s*fire/g, "riverfire")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function findEventBySlug(slug) {
  const list = Array.isArray(eventsData?.upcoming) ? eventsData.upcoming : [];
  const withSlug = list.map((e) => ({
    ...e,
    _slug: e.slug || slugify(e.title || e.name || ""),
  }));
  return withSlug.find((e) => e._slug === slug) || null;
}
function looksLikeBottomless(text = "") {
  return /\bbottomless\b/i.test(text);
}
function askType(text = "") {
  const s = String(text).toLowerCase();
  const asksPrice = /\b(price|cost|how much|cu[aá]nto|precio|vale)\b/.test(s);
  const asksWhen = /\b(when|what\s*time|hora|a\s*qué\s*hora|start|desde\s*qué\s*hora)\b/.test(s);
  const asksDay = /\b(what\s*day|which\s*day|qué\s*d[ií]a|date|fecha)\b/.test(s);
  return { asksPrice, asksWhen, asksDay, any: asksPrice || asksWhen || asksDay };
}

export async function POST(req) {
  try {
    const { message = "" } = await req.json().catch(() => ({ message: "" }));
    let text = String(message || "").trim();
    if (!text) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    console.info("[/api/chat] incoming text:", text);
    const routedo = routeIntent(text);
    console.info("[/api/chat] routed:", routedo);

    // Normalize typography
    text = text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-");

    const EN_SYSTEM = `You are Sunsets Rooftop Bar's official assistant (Brisbane).
Always reply in English, concise, friendly and helpful.`;

    // Quick keyword hints
    const wantsBooking = /\b(book|booking|reserve|reservation|table)\b/i.test(text);
    const wantsMap = /\b(map|google\s*maps|directions?)\b/i.test(text);
    const wantsFullMenu =
      /\b(full\s*menu|menu\s*pdf|drinks?\s*menu|wine\s*list|beverage\s*list)\b/i.test(text) ||
      /\b(show|open)\b.*\b(menu|pdf)\b/i.test(text);

    // Session memory
    const sessKey = sessionKey(req);
    const explicitEventSlug = detectEventSlug(text);
    if (explicitEventSlug) {
      const ev = findEventBySlug(explicitEventSlug);
      if (ev) memSet(sessKey, { type: "event", slug: explicitEventSlug, title: ev.title });
    }
    if (looksLikeBottomless(text)) {
      memSet(sessKey, { type: "bottomless", slug: "bottomless", title: bottomlessData?.name });
    }

    // Intent routing
    const routed = routeIntent(text);
    let intent = routed.intent;
    const options = { ...(routed.options || {}) };

    // Enrich options
    if (intent === "hours") {
      options.day = detectDayKey(text);
      options.field = detectHoursField(text);
    }
    if (intent === "events") {
      options.event = explicitEventSlug || detectEventSlug(text);
    }
    if (intent === "menu_filter") {
      const { tags, matchMode } = detectDietTags(text);
      options.wantedTags = tags;
      options.matchMode = matchMode;
      options.rawText = text;
    }
    if (intent === "menu" && /\b(desserts?|sweet|brownie|tart)\b/i.test(text)) {
      options.focus = "desserts";
    }

    // Smart memory follow-ups
    const asks = askType(text);
    if (asks.any && !explicitEventSlug && !looksLikeBottomless(text)) {
      const last = memGet(sessKey);
      if (last?.type === "bottomless") {
        intent = "bottomless";
        options.event = "bottomless";
      } else if (last?.type === "event") {
        intent = "events";
        options.event = last.slug;
      }
    }

    // Build knowledge context
    const context = buildContext(intent, options);

    // Generate deterministic reply
    let reply = fallbackReply(intent, context, text, options);
    // Combina una pequeña muletilla humana si el texto lo permite
    const maybeAck = ackFor(text);
    if (typeof reply === "string" && reply.trim()) {
      const trimmed = reply.trim();
      // Evita duplicar si el reply ya arranca con "Sure" / "Got it" / etc.
      if (!/^(sure|got it|absolutely|no problem|of course)/i.test(trimmed)) {
        reply = `${maybeAck}${trimmed}`;
      }
    }

    // Memory-based overrides
    const last = memGet(sessKey);
    if (asks.any && last) {
      if (last.type === "bottomless") {
        const price = bottomlessData?.price || "";
        const seating = bottomlessData?.seating || "";
        const parts = [];
        if (asks.asksPrice && price) parts.push(`Price: ${price}.`);
        if (asks.asksWhen && seating) parts.push(`${seating}.`);
        if (asks.asksDay)
          parts.push(`It runs every Sunday (order window 12–1pm, 2-hour session).`);
        if (parts.length) reply = parts.join(" ");
      } else if (last.type === "event") {
        const ev = findEventBySlug(last.slug);
        if (ev) {
          const parts = [];
          if (asks.asksPrice)
            parts.push(
              /\bsurcharge\b/i.test(ev.notes || "")
                ? `We don’t list a fixed package price; a surcharge secures your spot for ${ev.title}.`
                : `We don’t list a fixed price for ${ev.title}.`
            );
          if (asks.asksDay && ev.date) parts.push(`Date: ${ev.date}.`);
          if (asks.asksWhen) parts.push(`Start time isn’t listed — contact us for details.`);
          if (parts.length) reply = parts.join(" ");
        }
      }
    }

    // --- URLs & CTAs --------------------------------------------------------
    const MENU_PDF_URL =
      process.env.NEXT_PUBLIC_MENU_PDF_URL ||
      "https://static1.squarespace.com/static/64a4d80702811c7b1943faae/t/6808934601413a059f4bfea4/1745392454253/Web_Sunsets+Menu_AUWIN25.pdf";

    const SEVENROOMS_URL =
      process.env.NEXT_PUBLIC_SEVENROOMS_URL ||
      "https://www.sevenrooms.com/explore/sunsetsrooftopvenue/reservations/create/search";

    const MAPS_URL =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL ||
      "https://www.google.com/maps/place/SUNSETS+ROOFTOP";

    // Replace with simple preview for menu/drinks
    if ((intent === "menu" || wantsFullMenu) && MENU_PDF_URL) {
      reply = "Here’s a quick overview. For the complete and latest selection, open the full menu (PDF).";
    }

    // Build payload
    // Build payload
    const payload = {
      reply:
        typeof reply === "string" && reply.trim()
          ? reply.trim()
          : "I can help with hours, bookings, menu, allergens or events.",
      intent,
      options,
      suggestions: quickReplies(intent),
      system: EN_SYSTEM,
      source: "deterministic",
    };

    // === IA opcional para pulir el texto ===
    const AI_ON = String(process.env.AI_ENABLE || "").toLowerCase() === "true";
    // ⚙️ TEMP: forzar IA siempre (para pruebas)
    const FORCE_AI = true;
    const shouldUseAI = FORCE_AI || AI_ON;
    // Mini “muletilla” humana (ack) que refleja la intención del usuario
    function ackFor(text) {
      const s = String(text).toLowerCase();
      if (/\b(hi|hello|hey|hola)\b/.test(s)) return "Hi! ";
      if (/allergen|allergy|gf|gluten|lactose|vegan|vegetarian|df|dairy/.test(s)) return "Got it — allergy info coming up. ";
      if (/hours|open|close|kitchen|today|tomorrow/.test(s)) return "Sure — here are our hours. ";
      if (/book|booking|reserve|reservation/.test(s)) return "Sure — here’s how to book. ";
      if (/drink|cocktail|mocktail|wine|beer/.test(s)) return "Great choice — here’s what I recommend. ";
      if (/bottomless|brunch|sundaze/.test(s)) return "Here’s the Bottomless info. ";
      if (/private|venue|function|exclusive/.test(s)) return "We’d love to host you — here’s how private events work. ";
      if (/surcharge|sunday|public holiday/.test(s)) return "Quick heads-up on surcharges: ";
      return ""; // default sin muletilla
    }

    console.info("[/api/chat] AI mode:", shouldUseAI ? "ENABLED" : "OFF");
    console.info("[/api/chat] AI_ENABLE:", AI_ON);

    if (shouldUseAI && payload?.reply) {
      try {
        console.info("[/api/chat] ai-polish start → intent:", intent);
        const before = payload.reply;

        const polished = await aiPolish({
          draft: before,
          intent,
          question: text,
          context,
        });

        if (typeof polished === "string" && polished.trim()) {
          payload.reply = polished.trim();
          if (process.env.AI_DEBUG_TAG === "true") {
            payload.reply = `✨ ${payload.reply}`;
          }
          payload.source = "ai-polished"; 
          console.info(
            "[/api/chat] ai-polish done →",
            `len ${before.length}→${payload.reply.length}`,
            `preview: ${payload.reply.slice(0, 80).replace(/\n/g, " ")}…`
          );
        } else {
          console.warn("[/api/chat] ai-polish returned empty → keep draft");
        }
      } catch (e) {
        console.error("[/api/chat] ai-polish failed:", e);
   
      }
    }







    // CTAs (priority logic)
    if (intent !== "handoff_human") {
      if (!payload.cta && (intent === "bookings" || wantsBooking))
        payload.cta = { label: "Reserve here", href: SEVENROOMS_URL };
      if (
        !payload.cta &&
        (intent === "menu" || intent === "drinks" || wantsFullMenu) &&
        MENU_PDF_URL
      )
        payload.cta = { label: "Open full menu (PDF)", href: MENU_PDF_URL };
      if (!payload.cta && (intent === "location" || wantsMap))
        payload.cta = { label: "Open in Google Maps", href: MAPS_URL };

      const lastTopic = memGet(sessKey);
      if (!payload.cta && asks.any && lastTopic?.type === "bottomless")
        payload.cta = { label: "Reserve here", href: SEVENROOMS_URL };
    }

    // Fallback booking shortcut
    if (wantsBooking && intent !== "bookings" && intent !== "handoff_human") {
      payload.reply =
        "Sure — here you go:\n\n**Bookings**\n• Book online (up to 8 guests).\n• For larger groups, email hello@sunsets.space.";
      payload.intent = "bookings";
      payload.suggestions = ["Opening hours", "Menu"];
      payload.cta = { label: "Reserve here", href: SEVENROOMS_URL };
    }

    // Handoff logic
    if (intent === "handoff_human") {
      payload.escalate = true;
      payload.reply =
        "I’m really sorry about this. Please text **0475 229 525** or email **hello@sunsets.space**, and our manager will contact you shortly.";
      delete payload.cta;
    }

    // Leads: phone & email capture
    const phone = extractAndNormalizePhoneAU(text);
    const email = extractEmail(text);
    const stripped = text.replace(/[+()\s\-.\d]/g, "").replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, "").trim();
    const looksLikeJustContact = (phone || email) && stripped.length < 2;

    if (phone || email) {
      payload.leadCaptured = true;
      const maskedPhone = phone ? maskTail(phone, 6) : null;
      const maskedEmail = email ? maskEmail(email) : null;
      if (intent === "handoff_human" || looksLikeJustContact) {
        payload.reply = `Thanks — we’ve noted your contact ${maskedPhone || maskedEmail}. Our team will reach out shortly.`;
        delete payload.cta;
      }
    }

    console.info("[/api/chat]", {
      intent,
      options,
      cta: payload.cta?.label || null,
      escalate: !!payload.escalate,
      leadCaptured: !!payload.leadCaptured,
      phoneDetected: !!phone,
      emailDetected: !!email,
      source: payload.source,
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("API /chat fatal:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ===================== HELPERS ===================== */

function extractAndNormalizePhoneAU(input = "") {
  const s = String(input);
  const match = s.match(/\+?61?\s?4[\s\d()-]{7,12}|\b0?4[\s\d()-]{7,12}\b/g);
  if (!match) return null;
  const raw = match[0].replace(/[^\d+]/g, "");
  if (/^\+614\d{8}$/.test(raw)) return raw;
  if (/^04\d{8}$/.test(raw)) return raw.replace(/^0/, "+61");
  if (/^614\d{8}$/.test(raw)) return `+${raw}`;
  return null;
}

function extractEmail(input = "") {
  const m = String(input).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}

function maskTail(v, keep = 4) {
  return v ? v.slice(0, -keep).replace(/./g, "•") + v.slice(-keep) : v;
}

function maskEmail(email) {
  const [u, d] = String(email).split("@");
  if (!d) return "•••";
  const shortU = u.length <= 2 ? u[0] : u.slice(0, 2);
  return `${shortU}•••@${d}`;
}
