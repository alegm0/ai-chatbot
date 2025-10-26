// lib/chat/dates.js
import hoursRaw from "../knowledge/hours.json";

// === Base config (TZ from your JSON) ===
const HOURS_TZ = hoursRaw?.timezone || "Australia/Sydney";

// Day order and labels
export const DAY_ORDER = [
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday"
];

const DAY_LABEL = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday"
};

// --- Relative phrases (EN + ES) ---
const TODAY_RE = /\b(today|tonight|this\s+evening|hoy|esta\s*noche)\b/i;
const TOMORROW_RE = /\b(tomorrow|tmrw|tomm?y?|mañana)\b/i;
const WEEKEND_RE = /\b(weekend|this\s+weekend|next\s+weekend|fin\s*de\s*semana)\b/i;

// --- Hours fields (EN + ES) ---
const OPEN_RE = /\b(open|opening|opens|abre|abren|abierto)\b/i;
const CLOSE_RE = /\b(close|closing|closes|cierra|cierran|cerrado)\b/i;
// Treat "last orders"/"last call" as kitchen close window
const KITCHEN_RE = /\b(kitchen|last\s*orders?|last\s*call|cocina)\b/i;

// --- Day detection (EN only, singular/plural/abbr/with dot) ---
const DAY_PATTERNS = {
  monday:    /\b(mon(day)?s?)\.?\b/i,
  tuesday:   /\b(tue(s(day)?)?s?)\.?\b/i,
  wednesday: /\b(wed(nesday)?s?)\.?\b/i,
  thursday:  /\b(thu(rs(day)?)?s?)\.?\b/i,
  friday:    /\b(fri(day)?s?)\.?\b/i,
  saturday:  /\b(sat(urday)?s?)\.?\b/i,
  sunday:    /\b(sun(day)?s?)\.?\b/i,
};

// Modifiers: "this/next Monday"
const THIS_RE = /\b(this|este|esta)\b/i;
const NEXT_RE = /\b(next|próximo|proximo|siguiente)\b/i;

/** Weekday key (monday..sunday) for a date in a TZ */
function dayKeyInTz(date = new Date(), tz = HOURS_TZ) {
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: tz });
  const name = fmt.format(date).toLowerCase(); // e.g. "monday"
  return DAY_ORDER.find(d => d === name) || "monday";
}

/** Advance to next occurrence of "dayKey" starting from "base" */
function nextOccurrenceOf(dayKey, base = new Date(), tz = HOURS_TZ) {
  const baseKey = dayKeyInTz(base, tz);
  const curIdx = DAY_ORDER.indexOf(baseKey);
  const tgtIdx = DAY_ORDER.indexOf(dayKey);
  let delta = tgtIdx - curIdx;
  if (delta <= 0) delta += 7;
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

/** Resolve "weekend" to a concrete day:
 * - If today is Sat/Sun -> return today
 * - Otherwise -> return Saturday
 */
function resolveWeekendDay(base = new Date(), tz = HOURS_TZ) {
  const todayKey = dayKeyInTz(base, tz);
  if (todayKey === "saturday" || todayKey === "sunday") return todayKey;
  return "saturday";
}

/** Detect monday..sunday; supports today/tomorrow, weekend, and this/next Monday */
export function detectDayKey(text) {
  if (!text) return null;
  const s = String(text).toLowerCase();

  // today / tomorrow / tonight / hoy / mañana
  if (TODAY_RE.test(s))   return dayKeyInTz(new Date(), HOURS_TZ);
  if (TOMORROW_RE.test(s)) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return dayKeyInTz(tomorrow, HOURS_TZ);
  }

  // weekend / fin de semana
  if (WEEKEND_RE.test(s)) {
    if (NEXT_RE.test(s)) {
      // next weekend = Saturday next week
      const next = nextOccurrenceOf("saturday", new Date(), HOURS_TZ);
      next.setDate(next.getDate() + 7);
      return dayKeyInTz(next, HOURS_TZ);
    }
    return resolveWeekendDay(new Date(), HOURS_TZ);
  }

  // explicit weekday (en)
  for (const [dayKey, re] of Object.entries(DAY_PATTERNS)) {
    if (re.test(s)) {
      // "next monday" / "próximo lunes"
      if (NEXT_RE.test(s)) {
        const next = nextOccurrenceOf(dayKey, new Date(), HOURS_TZ);
        return dayKeyInTz(next, HOURS_TZ);
      }
      // "this monday" / "este lunes"
      if (THIS_RE.test(s)) return dayKey;
      return dayKey;
    }
  }

  return null;
}

/** "open" | "close" | "kitchen" | null  */
export function detectHoursField(text) {
  if (!text) return null;
  const s = String(text);
  if (KITCHEN_RE.test(s)) return "kitchen";
  if (OPEN_RE.test(s))    return "open";
  if (CLOSE_RE.test(s))   return "close";
  return null;
}

// Optional: pretty label for a day key
export function labelForDayKey(key) {
  return DAY_LABEL[key] || key;
}

/** 🕓 Format a date in the venue's timezone (e.g. "Fri, 12:00 PM AEST") */
export function formatDateTimeInTz(date, tz = HOURS_TZ) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    timeZoneName: "short"
  }).format(date);
}
