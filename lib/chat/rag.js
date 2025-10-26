// lib/chat/rag.js
import hoursRaw from "../knowledge/hours.json";
import location from "../knowledge/location.json";
import bookings from "../knowledge/bookings.json";
import allergens from "../knowledge/allergens.json";
import menu from "../knowledge/menu.json";
import policies from "../knowledge/policies.json";
import bottomless from "../knowledge/bottomless.json";
import events from "../knowledge/events.json";
import contact from "../knowledge/contact.json";

import payments from "../knowledge/payments.json";
import walkins from "../knowledge/walkins.json";
import giftcards from "../knowledge/giftcards.json";

import { detectDietTags } from "./entities";

// ---------- Helpers genéricos ----------
const NA = (alt = "") => `No tengo ese dato ahora${alt ? `, pero ${alt}` : ""}.`;

function arr(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  return [val];
}

// ---------- Hours ----------
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABEL = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday"
};

function normalizeHours(h) {
  return {
    timezone: h?.timezone || "",
    hours: h?.hours || {},
    notes: Array.isArray(h?.notes) ? h.notes : h?.notes ? [h.notes] : [],
  };
}
const H = normalizeHours(hoursRaw);

function nextOpenFrom(dayKey) {
  const startIdx = DAY_ORDER.indexOf(dayKey);
  if (startIdx === -1) return null;
  for (let i = 1; i <= DAY_ORDER.length; i++) {
    const idx = (startIdx + i) % DAY_ORDER.length;
    const d = DAY_ORDER[idx];
    const h = H.hours?.[d];
    if (h?.open) return { day: d, open: h.open };
  }
  return null;
}

function oneLineForDay(dKey, field) {
  const h = H.hours?.[dKey];
  if (!h || !h.open || !h.close) {
    const next = nextOpenFrom(dKey);
    const suffix = next ? ` (opens ${DAY_LABEL[next.day]} ${next.open})` : "";
    return `${DAY_LABEL[dKey]}: Closed${suffix}`;
  }
  const k = h.kitchenClose ? ` (kitchen closes: ${h.kitchenClose})` : "";
  if (field === "open") return `${DAY_LABEL[dKey]}: opens at ${h.open}`;
  if (field === "close") return `${DAY_LABEL[dKey]}: closes at ${h.close}`;
  if (field === "kitchen") return `${DAY_LABEL[dKey]}: kitchen closes at ${h.kitchenClose || "—"}`;
  return `${DAY_LABEL[dKey]}: ${h.open} – ${h.close}${k}`;
}

function weeklyHoursText(field) {
  const tz = H.timezone ? ` (TZ: ${H.timezone})` : "";
  const lines = DAY_ORDER.map((d) => `• ${oneLineForDay(d, field)}`).join("\n");
  const notes = H.notes.length ? `\nNotes: ${H.notes.join(" ")}` : "";
  return `HOURS${tz}:\n${lines}${notes}`;
}

function singleDayText(dayKey, field) {
  const tz = H.timezone ? ` (TZ: ${H.timezone})` : "";
  const line = `• ${oneLineForDay(dayKey, field)}`;
  const notes = H.notes.length ? `\nNotes: ${H.notes.join(" ")}` : "";
  return `HOURS${tz}:\n${line}${notes}`;
}

// ---------- Menu (tags, ranking) ----------
function formatDietLegend() {
  const legend = menu?.legend;
  if (legend && typeof legend === "object") {
    const pairs = Object.entries(legend).map(([k, v]) => `${String(k).toUpperCase()} = ${v}`);
    if (pairs.length) return pairs.join(" • ");
  }
  return "GF = gluten-free • GFO = gluten-free option • DF = dairy-free • DFO = dairy-free option • V = vegetarian • VG = vegan";
}

function collectItemTags(item) {
  return new Set([...(item.tags || []), ...(item.tagsExtra || [])].map(t => String(t).toLowerCase()));
}

function scoreItemMatch(item, wantedTags = new Set()) {
  const t = collectItemTags(item);
  let score = 0;
  if (wantedTags.has("gf")) score += t.has("gf") ? 1 : (t.has("gfo") ? 0.5 : 0);
  if (wantedTags.has("df")) score += t.has("df") ? 1 : (t.has("dfo") ? 0.5 : 0);
  if (wantedTags.has("vg")) score += t.has("vg") ? 1 : 0;
  if (wantedTags.has("v")) score += t.has("v") ? 1 : 0;
  if (wantedTags.has("gfo")) score += t.has("gfo") ? 1 : 0;
  if (wantedTags.has("dfo")) score += t.has("dfo") ? 1 : 0;
  if (wantedTags.has("nutfree")) score += t.has("nutfree") ? 1 : 0;
  return score;
}

/** badgeado limitado a lo pedido cuando showOnlyWanted=true */
function formatMenuItemLine(item, wantedTags = new Set(), showOnlyWanted = false) {
  const tags = collectItemTags(item);
  const has = (k) => tags.has(k);
  const badgeSet = new Set();

  if (showOnlyWanted) {
    if (wantedTags.has("gf")) badgeSet.add(has("gf") ? "GF" : (has("gfo") ? "GFO" : null));
    if (wantedTags.has("gfo") && has("gfo")) badgeSet.add("GFO");
    if (wantedTags.has("df")) badgeSet.add(has("df") ? "DF" : (has("dfo") ? "DFO" : null));
    if (wantedTags.has("dfo") && has("dfo")) badgeSet.add("DFO");
    if (wantedTags.has("vg") && has("vg")) badgeSet.add("VG");
    if (wantedTags.has("v") && has("v")) badgeSet.add("V");
    // if (wantedTags.has("nutfree") && has("nutfree")) badgeSet.add("NF");
  } else {
    if (has("gf")) badgeSet.add("GF"); else if (has("gfo")) badgeSet.add("GFO");
    if (has("df")) badgeSet.add("DF"); else if (has("dfo")) badgeSet.add("DFO");
    if (has("vg")) badgeSet.add("VG");
    if (has("v")) badgeSet.add("V");
  }

  const badges = [...badgeSet].filter(Boolean);
  const badgeStr = badges.length ? ` [${badges.join(", ")}]` : "";
  const priceStr = item.price ? ` — ${item.price}` : "";
  return `• ${item.name}${badgeStr}${priceStr}`;
}

function prettyWanted(wanted = new Set()) {
  const map = { gf: "gluten-free", gfo: "gluten-free option", df: "dairy-free", dfo: "dairy-free option", vg: "vegan", v: "vegetarian", nutfree: "nut-free" };
  const arr = Array.from(wanted).map(k => map[k] || k);
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];
  return arr.slice(0, -1).join(", ") + " and " + arr.slice(-1);
}

// AND/OR de verdad para filtros
function satisfiesWanted(item, wanted = new Set(), mode = "and") {
  if (!wanted || wanted.size === 0) return true;
  const t = collectItemTags(item);
  const checks = [];
  if (wanted.has("gf")) checks.push(t.has("gf") || t.has("gfo"));
  if (wanted.has("gfo")) checks.push(t.has("gfo"));
  if (wanted.has("df")) checks.push(t.has("df") || t.has("dfo"));
  if (wanted.has("dfo")) checks.push(t.has("dfo"));
  if (wanted.has("vg")) checks.push(t.has("vg"));
  if (wanted.has("v")) checks.push(t.has("v"));
  if (wanted.has("nutfree")) checks.push(t.has("nutfree"));
  return mode === "and" ? checks.every(Boolean) : checks.some(Boolean);
}

// ---------- DRINKS helpers ----------
function sectionsBy(pattern) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), "i");
  return (menu.sections || []).filter((s) => re.test(String(s.name)));
}
function listItems(sec, mapLine = (i) => `• ${i.name}${i.price ? ` — ${i.price}` : ""}`) {
  return (sec.items || []).map(mapLine).join("\n");
}
function cap(text, maxLines = 20) {
  const lines = String(text).split("\n");
  return lines.length > maxLines ? [...lines.slice(0, maxLines), "• …"].join("\n") : text;
}

// ---------- Main RAG ----------
export function buildContext(intent, options = {}) {
  switch (intent) {
    case "hours": {
      const rawDay = options?.day;
      const day = typeof rawDay === "string" ? rawDay.toLowerCase() : null;
      const field = options?.field || null;
      if (day && DAY_ORDER.includes(day)) return singleDayText(day, field);
      return weeklyHoursText(field);
    }



    
    case "location": {
      const parkingList = arr(location.parking);
      const parkingLines = parkingList.map((p) => `• ${p}`).join("\n");
      return `LOCATION & PARKING:
- Address: ${location.address || NA("te puedo dar direcciones")}
- Access: ${location.access || NA("puedo ayudarte con accesos")}
${parkingLines ? "Parking:\n" + parkingLines : ""}
- Notes: ${location.notes || ""}`.trim();
    }

    case "bookings": {
      const tips = Array.isArray(bookings.tips) ? bookings.tips.join(" ") : bookings.tips || "";
      return `BOOKINGS:
- How to book: ${bookings.howToBook || NA("te paso el link de reservas")}
- Tips: ${tips || "Try alternate times or party sizes if unavailable."}
- Contact: ${bookings.contact || contact?.email || ""}`.trim();
    }

    // ---- DRINKS (listado) ----
    case "drinks": {

      
      const drinkSecs = sectionsBy(/^(drinks|champagne|sparkling|white|ros[eé]|chilled red|red|cocktails|zero cocktails|mocktails)/i);
      if (!drinkSecs.length) return "DRINKS:\nNo drinks listed.";
      const blocks = drinkSecs.map((s) => {
        const items = listItems(s, (i) => {
          const tags = [...(i.tags || []), ...(i.tagsExtra || [])].map(x => String(x).toUpperCase());
          const badge = tags.length ? ` [${tags.join(", ")}]` : "";
          const price = i.price ? ` — ${i.price}` : "";
          return `• ${i.name}${badge}${price}`;
        });
        return `**${s.name.toUpperCase()}**\n${items}`;
      });
      return cap(`DRINKS:\n${blocks.join("\n\n")}`, 60);
    }

    // ---- DRINKS recommend por perfil ----
    case "drinks_recommend": {
      const flavor = String(options?.flavor || "").toLowerCase() || null;
      const cocktailSecs = sectionsBy(/cocktails/i);
      const zeroSecs = sectionsBy(/zero cocktails|mocktails/i);

      const sigItems = cocktailSecs.flatMap((s) => s.items || []);
      const zeroItems = zeroSecs.flatMap((s) => s.items || []);

      const flavorPick = (arr, fz) =>
        arr.filter((i) => (fz ? collectItemTags(i).has(fz) : true));

      const fallbackMap = { fruity: ["tropical", "sweet", "citrus"], tropical: ["fruity", "citrus"], citrus: ["sour", "fruity"], spicy: ["bitter", "herbal"] };

      let rec = flavorPick(sigItems, flavor);
      if (!rec.length && flavor) {
        for (const alt of (fallbackMap[flavor] || [])) {
          rec = flavorPick(sigItems, alt);
          if (rec.length) break;
        }
      }
      if (!rec.length) {
        rec = sigItems.filter(i => {
          const t = collectItemTags(i);
          return t.has("fruity") || t.has("tropical") || t.has("citrus");
        });
        if (!rec.length) rec = sigItems;
      }

      if (!rec.length) {
        return `SIGNATURE COCKTAILS${flavor ? ` — ${flavor}` : ""}:
${NA("te puedo sugerir mocktails o vinos")} `;
      }

      const pickTop = (items, n = 6) => items.slice(0, n);
      const lines = pickTop(rec, 6).map(i => `• ${i.name}${i.price ? ` — ${i.price}` : ""}`).join("\n");
      const mocktailHint = pickTop(flavorPick(zeroItems, flavor).concat(zeroItems), 2).map(i => i.name).join(", ");

      return `SIGNATURE COCKTAILS${flavor ? ` — ${flavor}` : ""}:
${lines}${mocktailHint ? `

Zero-alc options: ${mocktailHint}` : ""}`.trim();
    }

    case "allergens":
      return `ALLERGENS:
- Policy: ${allergens.policy || NA("podemos revisar opciones sin gluten/lácteos/nueces")}
- Disclaimer: ${allergens.disclaimer || ""}`.trim();

    // ---- MENU overview / desserts focus ----
    case "menu": {
      if (options?.focus === "desserts") {
        const sec = (menu.sections || []).find((s) => /dessert/i.test(String(s.name)));
        if (sec?.items?.length) {
          const lines = sec.items.map((i) => {
            const price = i.price ? ` — ${i.price}` : "";
            const tags = [...(i.tags || []), ...(i.tagsExtra || [])].map(t => String(t).toUpperCase());
            const badge = tags.length ? ` [${tags.join(", ")}]` : "";
            return `• ${i.name}${badge}${price}`;
          }).join("\n");
          return `DESSERTS:\n${lines}`.trim();
        }
      }
      const sections = (menu.sections || []).map((s) => `• ${s.name}: ${(s.items || []).map(i => i.name).join(", ")}`).join("\n");
      return `MENU SECTIONS:
${sections}
(Ask about a specific item or dietary option.)`.trim();
    }

    // ---- MENU filtrado ----
    case "menu_filter": {
      let wantedSet = new Set();
      let mode = "and";

      if (options?.wantedTags instanceof Set) {
        wantedSet = new Set([...options.wantedTags].map(s => String(s).toLowerCase()));
      } else if (Array.isArray(options?.wantedTags)) {
        wantedSet = new Set(options.wantedTags.map(s => String(s).toLowerCase()));
      } else if (options?.rawText) {
        const det = detectDietTags(options.rawText);
        wantedSet = new Set([...(det?.tags || [])].map(s => String(s).toLowerCase()));
        mode = options?.matchMode || det?.matchMode || "and";
      }

      if (wantedSet.size === 0) {
        const sections = (menu.sections || []).map((s) => `• ${s.name}: ${(s.items || []).map(i => i.name).join(", ")}`).join("\n");
        return `MENU SECTIONS:
${sections}
(Ask about a specific item or dietary option.)`.trim();
      }

      const sectionsToScan = options?.section === "desserts"
        ? (menu.sections || []).filter((s) => /dessert/i.test(s.name))
        : (menu.sections || []);

      const foodOnly = sectionsToScan.filter(s => !/^(drinks|champagne|sparkling|white|ros[eé]|chilled red|red|cocktails|zero cocktails|mocktails)/i.test(String(s.name)));

      const blocks = [];
      for (const section of foodOnly) {
        const matched = (section.items || [])
          .filter(i => satisfiesWanted(i, wantedSet, mode))
          .map(i => ({ item: i, score: scoreItemMatch(i, wantedSet) }))
          .sort((a, b) => b.score - a.score || String(a.item.name).localeCompare(b.item.name));

        if (!matched.length) continue;

        const itemsFmt = matched.map(x => formatMenuItemLine(x.item, wantedSet, true)).join("\n");
        blocks.push(`**${section.name.toUpperCase()}**\n${itemsFmt}`);
      }

      const legend = formatDietLegend();
      const pretty = prettyWanted(wantedSet);
      const body = blocks.join("\n\n");

      if (!body) {
        return `MENU FILTERED OPTIONS:
Sorry, we don’t have listed dishes for **${pretty}**.
Some items might be adaptable on request — please ask our team.

Legend: ${legend}
(If you have a severe allergy, please inform staff on arrival.)`.trim();
      }

      return `MENU FILTERED OPTIONS:
${body}

(If you have a severe allergy, please inform staff on arrival.)`.trim();
    }

    // ---- Policies ----
    case "cancellation": {
      const c = policies.cancellation || {};
      return `CANCELLATION POLICY:
- Up to 4 guests: ${c.groupsUpTo4 || "—"}
- 5+ guests: ${c.groups5Plus || "—"}
- 18+ guests: ${c.groups18Plus || "—"}
- No-show/late change fee: ${c.noShowFee || "—"}`.trim();
    }

    case "cakeage": {
      const k = policies.cake || {};
      return `CAKEAGE:
- Allowed: ${k.allowed ? "Yes" : "No"}
- Notice: ${k.notice || "—"}
- Fee: ${k.cakeageFee || "—"}
- Notes: ${k.notes || ""}`.trim();
    }

    case "decorations":
      return `DECORATIONS:
- ${policies.decorations?.notes || "No decorations allowed."}`.trim();

    case "dresscode":
      return `DRESS CODE:
- ${policies.dresscode || "Smart casual."}`.trim();

    case "age":
      return `AGE RESTRICTIONS:
- ${policies.ageRestrictions || "—"}`.trim();

    case "weather":
      return `WEATHER:
- ${policies.weather || "—"}`.trim();

    case "table":
      return `TABLE ALLOCATION:
- ${policies.tableAllocation || "—"}`.trim();

    case "accessibility":
      return `ACCESSIBILITY:
- ${policies.accessibility || "—"}`.trim();

    case "surcharge": {
      const s = policies.surcharge || {};
      return `SURCHARGES:
- Sundays: ${s.sunday || "—"}
- Public Holidays: ${s.publicHoliday || "—"}`.trim();
    }

    // ---- Payments ----
    case "payments": {
      const p = payments || {};
      const lines = [];
      if (Array.isArray(p.accepted) && p.accepted.length) lines.push(`- Accepted: ${p.accepted.join(", ")}`);
      if (Array.isArray(p.contactless) && p.contactless.length) lines.push(`- Contactless: ${p.contactless.join(", ")}`);
      if (typeof p.splitBill !== "undefined") lines.push(`- Split bill: ${p.splitBill}`);
      if (p.surcharge) {
        const s = p.surcharge;
        const sL = [];
        if (s.card) sL.push(`Card: ${s.card}`);
        if (s.amex) sL.push(`Amex: ${s.amex}`);
        if (s.publicHoliday) sL.push(`Public Holidays: ${s.publicHoliday}`);
        if (s.sunday) sL.push(`Sundays: ${s.sunday}`);
        if (sL.length) lines.push(`Surcharges:\n• ${sL.join("\n• ")}`);
      }
      if (p.notes) lines.push(`Notes: ${p.notes}`);
      return `PAYMENTS:\n${lines.join("\n") || "—"}`.trim();
    }

    // ---- Walk-ins ----
    case "walkins": {
      const w = walkins || {};
      const lines = [];
      if (w.policy) lines.push(`- Policy: ${w.policy}`);
      if (w.peakTimes) lines.push(`- Peak times: ${w.peakTimes}`);
      if (w.waitlist) lines.push(`- Waitlist: ${w.waitlist}`);
      if (w.suggestions) lines.push(`- Tips: ${w.suggestions}`);
      if (w.notes) lines.push(`Notes: ${w.notes}`);
      return `WALK-INS:\n${lines.join("\n") || "—"}`.trim();
    }

    // ---- Gift Cards ----
    case "giftcards": {
      const g = giftcards || {};
      const lines = [];
      if (g.available) lines.push(`- Available: ${g.available}`);
      if (g.whereToBuy) lines.push(`- Where to buy: ${g.whereToBuy}`);
      if (g.howToRedeem) lines.push(`- How to redeem: ${g.howToRedeem}`);
      if (g.expiry) lines.push(`- Expiry: ${g.expiry}`);
      if (g.terms) lines.push(`- Terms: ${g.terms}`);
      return `GIFT CARDS:\n${lines.join("\n") || "—"}`.trim();
    }
    
    case "private_event": {
      const pe = policies.privateEvent || {};
      return `PRIVATE EVENTS & VENUE HIRE:
- Required: ${pe.required || "—"}
- How to book: ${pe.howToBook || "Please contact our team to discuss your event."}
- Contact: ${pe.contact || contact?.email || ""}
- Notes: ${pe.notes || "Event details (pricing, capacity, setup) depend on each booking — please email us for a quote."}`.trim();
    }

    // ---- Deposits / Prepayments ----
    case "deposit": {
      const d = policies.deposit || {};
      return `DEPOSITS & CARD POLICY:
- Required: ${d.required || "—"}
- Amount: ${d.amount || "—"}
- Refund policy: ${d.refund || "—"}
- Notes: ${d.notes || ""}`.trim();
    }

    // ---- Bottomless ----
    case "bottomless": {
      const lines = [];
      if (bottomless.seating) lines.push(`- Seating: ${bottomless.seating}`);
      if (bottomless.price) lines.push(`- Price: ${bottomless.price}`);
      const bevs = arr(bottomless.beverages);
      if (bevs.length) {
        const list = Array.isArray(bevs) ? bevs : String(bevs);
        lines.push(`- Beverages: ${Array.isArray(list) ? list.join(", ") : list}`);
      }
      const banquet = arr(bottomless.banquet).map(i => `• ${i}`).join("\n");
      if (banquet) lines.push(`Banquet:\n${banquet}`);
      if (bottomless.notes) lines.push(`Notes: ${bottomless.notes}`);

      if (!lines.length) return `BOTTOMLESS SUNDAZE:\n${NA("te puedo ayudar con reservas o menú")}`;
      return `BOTTOMLESS SUNDAZE:\n${lines.join("\n")}`.trim();
    }

    // ---- Desserts quick list ----
    case "desserts": {
      const sec = (menu.sections || []).find((s) => /dessert/i.test(String(s.name)));
      if (!sec) return "DESSERTS:\nNo desserts listed.";
      const items = (sec.items || []).map((i) => {
        const tags = [...(i.tags || []), ...(i.tagsExtra || [])].map(x => String(x).toUpperCase());
        const badge = tags.length ? ` [${tags.join(", ")}]` : "";
        const price = i.price ? ` — ${i.price}` : "";
        return `• ${i.name}${badge}${price}`;
      }).join("\n");
      return `DESSERTS:\n${items}`.trim();
    }

    // ---- Events simple (lista) ----
    case "events": {
      // tus events.json actuales son simples; mostramos lista
      const list = arr(events?.upcoming);
      const lines = list.map((e) => {
        const title = e.title || e.name || "Event";
        const date = e.date ? ` — ${e.date}` : "";
        const notes = e.notes ? `: ${e.notes}` : "";
        return `• ${title}${date}${notes}`;
      }).join("\n");
      return `WHAT'S ON:\n${lines || "No upcoming events listed."}`.trim();
    }

    // ---- Contacto ----
    case "contact":
      return `CONTACT:
- Email: ${contact?.email || ""}
- SMS: ${contact?.sms || ""}
- Support hours: ${contact?.supportHours || ""}
For existing bookings: ${contact?.existingBooking || ""}`.trim();

   default:
  return `ABOUT SUNSETS ROOFTOP BAR:
Located in Brisbane’s CBD with stunning river views.
You can ask me about:
• Bookings
• Bottomless Sundaze
• Menu & Allergens
• Hours & Location
• Private Events
• Policies & Payments`.trim();
  }
}
