// lib/chat/intentRouter.js
import { detectDietTags } from "./entities";
import { detectEventSlug } from "./entities";

// --- Regex helpers ---
const THANKS_RE =
  /\b(thanks|thank\s*you|ty|much\s+appreciated|cheers|appreciate(?:\s*it)?|thanks!?)\b/i;

const ANGRY_RE =
  /\b(this\s+is\s+unacceptable|angry|furious|very\s+upset|not\s+happy|frustrated|disappointed)\b/i;

const MANAGER_RE =
  /\b(manager|talk\s+to\s+(a\s+)?manager|not\s+helping|speak\s+to\s+(a\s+)?person|real\s+person|human|staff|representative)\b/i;

const DESSERT_RE = /\b(desserts?|something\s*sweet|sweet\s*options)\b/i;

// Incluye cocktails/mocktails y no-alc
const DRINKS_TOKENS =
  /\b(cocktails?|drinks?|mocktails?|beers?|beer|wine|prosecco|champagne|spritz|negroni|margarita|martini|mojito|non[-\s]?alcoholic|zero[-\s]?alcohol)\b/i;

const FLAVOR_RE =
  /\b(fruity|tropical|citrus|sweet|sour|spicy|herbal|bitter)\b/i;

const HOURS_TOKENS =
  /\b(hours?|open|opening|opens?|close|closing|closes?|kitchen|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|horario|abre|abren|cierra|cierre|cocina|hoy|mañana)\b/i;

// --- Payments detector (EN + ES, incluye CASH y split variants) ---
const PAYMENTS_RE = /\b(?:payments?|payment|pay|visa|master\s*card|mastercard|amex|american\s*express|diners|tap|contactless|apple\s*pay|google\s*pay|cash|split(?:\s*(?:the\s*)?bill|(?:ting|ted)?\s*bills?|(?:ting|ted)?\s*payments?)|splits?\s*(?:per\s*(?:table|tab))?|separate\s*(?:checks?|bills?)|pay\s*(?:separately|individually)|dividir(?:\s*la)?\s*cuentas?|dividir(?:\s*la)?\s*cuenta|separar(?:\s*la)?\s*cuentas?|separar(?:\s*la)?\s*cuenta)\b/i;

// --- Allergens detector ampliado ---
const ALLERGENS_RE = /\b(?:allerg(?:y|ies)|allergen(?:s)?|nut[-\s]?free|peanut[-\s]?free|lactose[-\s]?free|lactosa|vegan|gluten[-\s]?free|sin\s+gluten|celiac(?:s)?|celiaco(?:s)?|df|gf)\b/i;
// ⬇️ PONER JUNTO A OTROS REGEX ARRIBA
const PRIVATE_EVENT_RE = /\b(private\s*events?|private\s*part(?:y|ies)|venue\s*hire|function\s*room|functions?|exclusive\s*use|corporate\s*events?|book\s*out\s+the\s+venue|private\s*booking(?:s)?)\b/i;




// Exposed helpers
export function isThanks(text = "") {
  return THANKS_RE.test(String(text));
}
export function isAngry(text = "") {
  return ANGRY_RE.test(String(text));
}

/**
 * routeIntent(text)
 * Clasifica intenciones para /api/chat
 */
export function routeIntent(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return { intent: "unknown" };


   // --- Menu / Food ---
  if (/\b(menu|food|eat|dishes?)\b/i.test(t)) {
    return { intent: "menu" };
  }
  if (PRIVATE_EVENT_RE.test(t) || /\b(venue\s*capacity|min\s*spend|packages?|quote|available\s*dates?)\b/i.test(t)) {
    return { intent: "private_event" };
  }
  // --- PRIORIDAD: pagos / giftcards / walk-ins (antes de bookings/menu) ---
  // Hotfix directo para frases con split / per table / multiple payments (con paréntesis correctos)
  if (
    ((/\bsplit(s|ting|ted)?\b/i.test(t) && (/\bbills?\b/i.test(t) || /\bpayments?\b/i.test(t))) ||
      /\bper\s+(?:table|tab)\b/i.test(t) ||
      /\bmultiple\s+payments?\b/i.test(t) ||
      /\bdivid/i.test(t)) // dividir / dividido / etc (ES)
  ) {
    return { intent: "payments" };
  }

  if (PAYMENTS_RE.test(t)) {
    return { intent: "payments" };
  }

  if (/\b(gift\s*cards?|gift\s*vouchers?|vouchers?)\b/i.test(t)) {
    return { intent: "giftcards" };
  }

  if (/\b(walk[-\s]?ins?|walk\s*in|no\s*booking|without\s*booking|just\s*show\s*up|walk\s*up)\b/i.test(t)) {
    return { intent: "walkins" };
  }

  // --- Cancellation / Deposit / Private events (antes de bookings) ---
  if (/\b(cancel|cancelar|cancelation|cancellation|no[-\s]?show|late\s*change|refund|fee|charge)\b/i.test(t)) {
    return { intent: "cancellation" };
  }

  if (/\b(deposit|prepayment|pre\s*payment|hold\s*fee|card\s*hold)\b/i.test(t)) {
    return { intent: "deposit" };
  }

  // --- Hours / Location ---
  if (HOURS_TOKENS.test(t)) {
    return { intent: "hours" };
  }

  if (
    /\b(location|address|map|parking|park|directions?|wheelchair|lift|access)\b/i.test(t) ||
    /\b(where\s+(are|r)\s+(you|u)|where\s+is\s+(sunsets|the\s+venue|the\s+bar|it))\b/i.test(t)
  ) {
    return { intent: "location" };
  }


  // --- Greetings / manager / angry ---
  if (/\b(hi|hello|hey|hola)\b/i.test(t)) return { intent: "greeting" };
  if (THANKS_RE.test(t)) return { intent: "thanks" };
  if (MANAGER_RE.test(t)) return { intent: "handoff_human" };
  if (ANGRY_RE.test(t)) return { intent: "handoff_human" };

  // --- Age / Cakeage / Other policies ---
  if (/\b(\d{1,2}-year-old|under\s*\d+|kids?|children|minors?|kids?\s*menu|16\+|18\+)\b/i.test(t)) {
    return { intent: "age" };
  }

  if (/\b(cake|cakeage|bring(\s*(my|our))?\s*own\s*cake)\b/i.test(t)) {
    return { intent: "cakeage" };
  }

  if (/\b(decorations?|balloons?|confetti|costume|decor)\b/i.test(t)) {
    return { intent: "decorations" };
  }

  if (/\b(dress\s?code|what.*wear|smart\s+casual)\b/i.test(t)) {
    return { intent: "dresscode" };
  }

  if (/\b(surcharge|surcharges?|public\s+holiday|sundays?)\b/i.test(t)) {
    return { intent: "surcharge" };
  }


  if (DRINKS_TOKENS.test(t) && FLAVOR_RE.test(t)) {
    const m = FLAVOR_RE.exec(t);
    return { intent: "drinks_recommend", options: { flavor: m?.[1] } };
  }
  // “sweet cocktails”, “tropical cocktail”, etc.
  if (FLAVOR_RE.test(t) && /\bcocktails?\b/i.test(t)) {
    const m = FLAVOR_RE.exec(t);
    return { intent: "drinks_recommend", options: { flavor: m?.[1] } };
  }

  if (/\b(recommend|suggest|best|favourite|favorite|good|top)\b/i.test(t) && DRINKS_TOKENS.test(t)) {
    const m = FLAVOR_RE.exec(t);
    return { intent: "drinks_recommend", options: { flavor: m?.[1] } };
  }

  if (DRINKS_TOKENS.test(t)) {
    return { intent: "drinks" };
  }

  // --- Desserts ---
  if (DESSERT_RE.test(t)) {
    if (/\b(vegan|vegetarian|gluten[-\s]?free|dairy[-\s]?free|gf|df|vg|v|gfo|dfo)\b/i.test(t)) {
      return { intent: "menu_filter", options: { section: "desserts" } };
    }
    return { intent: "menu", options: { focus: "desserts" } };
  }

  // --- Diet filters (avoid drinks collisions) ---
  const diet = detectDietTags(t);
  if (
    !DRINKS_TOKENS.test(t) &&
    (diet?.tags?.size > 0 ||
      /\b(vegan|vegetarian|dairy[-\s]?free|gluten[-\s]?free|lactose[-\s]?free)\b/i.test(t))
  ) {
    return {
      intent: "menu_filter",
      options: { wantedTags: Array.from(diet.tags || []) },
      matchMode: diet.matchMode,
    };
  }


  // --- Bookings ---
  if (/\b(book|booking|reserve|reservation|table|walk[-\s]?in|group\s+booking|availability)\b/i.test(t)) {
    return { intent: "bookings" };
  }

  // --- Allergens ---
  if (!DRINKS_TOKENS.test(t) && ALLERGENS_RE.test(t)) {
    return { intent: "allergens" };
  }

  // --- Bottomless / Events ---
  if (/\b(bottomless|sundaze|brunch|banquet|session)\b/i.test(t)) {
    return { intent: "bottomless" };
  }

  const slug = detectEventSlug(t);
  if (slug) return { intent: "events", options: { event: slug } };

  if (/\b(event||eventswhat'?s\s+on|weekend|happening)\b/i.test(t)) {
    return { intent: "events" };
  }

  // --- Contact ---
  if (/\b(contact|phone|text|sms|email|call|number|reach|message)\b/i.test(t)) {
    return { intent: "contact" };
  }

 

  return { intent: "unknown" };
}

// Compat simple
export function detectIntent(text) {
  const { intent } = routeIntent(text);
  return intent;
}