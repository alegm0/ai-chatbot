// 🌅 Natural openers (short, friendly)
import eventsData from "../knowledge/events.json";

const OPENERS = [
  "Sure — here you go:",
  "Absolutely. Here’s the info:",
  "Got it. Here are the details:",
  "No problem — details below:",
  "Of course! Let me show you:",
  "Here’s what I found for you:",
];
function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")         // comillas tipográficas
    .replace(/\s+/g, "-")         // espacios → guiones
    .replace(/[^a-z0-9-]/g, "")   // limpia
    .replace(/-+/g, "-");         // colapsa guiones
}

// 💬 Natural closers (short and contextual)
const CLOSERS = [
  "Anything else I can help you with?",
  "Would you like to see our menu or book a table?",
  "Need help with reservations or parking?",
  "I can also help with bookings, menu or events.",
  "Want details on allergens or opening hours?",
  "You can ask me about Bottomless Sundaze or private events too!",
  "Would you like our contact details?",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatBlock(title, body) {
  return `**${title}**\n${body}`;
}

function bullets(body) {
  return String(body || "").replaceAll("- ", "• ");
}

function sliceAfter(label, context) {
  const src = String(context || "");
  const esc = String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${esc}:?\\s*`, "i");
  return src.replace(re, "").trim();
}

function randomSubset(arr, n = 2) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const copy = [...arr];
  copy.sort(() => 0.5 - Math.random());
  return copy.slice(0, n);
}

function suggestLine(arr) {
  const picks = randomSubset(arr, 2);
  return picks.length ? `\n\nTry: ${picks.map((s) => `“${s}”`).join(" · ")}` : "";
}

function maybeAddCloser(text) {
  const clean = String(text);
  const tooLong = clean.length >= 600;
  const hasTip = /💡 Tip:/i.test(clean);
  const hasTrunc = /\(…truncated/i.test(clean);
  if (tooLong || hasTip || hasTrunc) return "";
  return `\n\n${pick(CLOSERS)}`;
}

function filteredTitle(userText = "") {
  const t = String(userText).toLowerCase();
  if (/\b(?:gluten[-\s]?free|gf)\b/.test(t)) return "Gluten-free options";
  if (/\b(?:dairy[-\s]?free|df|lactose[-\s]?free)\b/.test(t)) return "Dairy-free options";
  if (/\b(?:vegan|vg)\b/.test(t)) return "Vegan options";
  if (/\b(?:vegetarian|v(?!g))\b/.test(t)) return "Vegetarian options";
  if (/\b(?:nut[-\s]?free|peanut[-\s]?free)\b/.test(t)) return "Nut-free options";
  return "Filtered menu";
}


// --- 💬 FALLBACK REPLY ---
export function fallbackReply(intent, context, userText, options) {
  const opener = pick(OPENERS);

  switch (intent) {
    // HOURS / LOCATION --------------------------------------------------------
    case "hours": {
      const body = bullets(sliceAfter("HOURS", context));
      const out = `${opener}\n${formatBlock("Opening hours", body)}`;
      return out + maybeAddCloser(out);
    }

    case "location": {
      const body = bullets(sliceAfter("LOCATION & PARKING", context));
      const out = `${opener}\n${formatBlock("Location & Parking", body)}`;
      return out + maybeAddCloser(out);
    }




    // BOOKINGS / DEPOSIT / CANCELLATION ---------------------------------------
    case "bookings": {
      const out = `${opener}\n${formatBlock(
        "Bookings",
        "• Book online for up to 8 guests via the Reservations page.\n• For groups of 9+ guests, please email **hello@sunsets.space** — a valid card is required to secure your booking.\n• Cash payments are accepted on the day, but a card must still be provided in case of no-shows or unpaid balances.\n\n💡 Tip: Confirm your final group size to avoid cancellation fees."
      )}\n\n📞 [Call Sunsets](tel:+61475229525)\n💬 [Text us](sms:+61475229525)\n📧 [Email hello@sunsets.space]`;
      return out + maybeAddCloser(out);
    }

    case "deposit": {
      const out = `${opener}\n${formatBlock(
        "Deposit Policy",
        "For large group bookings, a **card hold or prepayment** may apply. No charge is made unless the booking is cancelled late or guests fail to attend.\n\nAccepted payment methods: Visa, Mastercard, Amex, Apple Pay, Google Pay."
      )}`;
      return out + maybeAddCloser(out);
    }

    case "cancellation": {
      const out = `${opener}\n${formatBlock(
        "Cancellation Policy",
        "• To cancel or change a booking, please email **hello@sunsets.space** or text **0475 229 525** with your name and booking date.\n• Cancellations within 24h may incur a fee.\n• For large groups, the card on file may be charged in case of no-show.\n\n💡 Tip: Text is best during peak hours (Thu–Sun)."
      )}`;
      return out + maybeAddCloser(out);
    }


    // --- Allergens ------------------------------------------------------
    case "allergens": {
      const out = `${opener}\n${formatBlock(
        "Allergens",
        `Policy: ${context.allergens?.policy || "We can review gluten/dairy/nut-free options upon request."}\n` +
        `Disclaimer: ${context.allergens?.disclaimer || "(If you have a severe allergy, please inform staff on arrival.)"}`
      )}`;
      return out + maybeAddCloser(out);
    }

    // MENU & FILTERS ----------------------------------------------------------
    case "menu": {
      const body = sliceAfter("MENU SECTIONS", context);
      const out = `${opener}\n${formatBlock(
        "Menu overview",
        body + "\n\nYou can ask me for vegan, gluten-free, or cocktail options."
      )}`;
      return out + maybeAddCloser(out);
    }


    case "menu_filter": {
      const body = sliceAfter("MENU FILTERED OPTIONS", context);
      const suggestions = [
        "Show vegan mains",
        "Gluten-free desserts",
        "Dairy-free small plates",
        "Cocktails",
        "Show vegetarian dishes",
      ];
      const title = filteredTitle(userText);
      return `${opener}\n${formatBlock(title, body)}${suggestLine(suggestions)}`;
    }
    case "surcharge": {
      const body = sliceAfter("SURCHARGES", context);
      const out = `${opener}\n${formatBlock("Surcharges", body)}`;
      return out + maybeAddCloser(out);
    }
    // PAYMENTS / SURCHARGES ---------------------------------------------------
    case "payments": {
      const body = bullets(sliceAfter("PAYMENTS", context));
      const out = `${opener}\n${formatBlock(
        "Payments & Surcharges",
        body +
        "\n\n💡 Tip: For large groups or busy service times, we recommend one payment per table to ensure smooth service."
      )}`;
      return out + maybeAddCloser(out);
    }



    // PRIVATE EVENTS ----------------------------------------------------------
    case "private_event": {
      const out = `${opener}\n${formatBlock(
        "Private Events & Venue Hire",
        "We’d love to host your celebration or corporate event.\n\n• Availability: Thursday to Sunday afternoons & evenings.\n• Capacity: Up to 150 guests depending on setup.\n• Includes: Custom menu, bar packages, private bar & dedicated staff.\n\nPlease email **hello@sunsets.space** or text **0475 229 525** with your event details and group size. Our team will confirm availability and send tailored options."
      )}\n\n)`;
      return out + maybeAddCloser(out);
    }

    case "events": {
  // Normaliza: minúsculas, sin apóstrofes ni guiones, espacios colapsados
  const norm = (s = "") =>
    String(s)
      .toLowerCase()
      .replace(/[’‘']/g, "")    // 👈 elimina apóstrofes rectos y tipográficos
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const askedSlug = norm(options?.event || "");

  const list =
    (Array.isArray(context?.events?.upcoming) && context.events.upcoming) ||
    (Array.isArray(eventsData?.upcoming) && eventsData.upcoming) ||
    [];

  // Debug (puedes dejarlo mientras pruebas)
  console.info("[events debug] askedSlug:", askedSlug);
  console.info(
    "[events debug] events found:",
    list.map(e => ({ slug: e.slug, title: e.title }))
  );

  if (askedSlug && list.length) {
    const ev = list.find((e) => {
      // 👇 usa title como respaldo si no hay slug
      const eslug = norm(e?.slug || e?.title || e?.name || "");
      const title = norm(e?.title || e?.name || "");
      return eslug === askedSlug || title.includes(askedSlug);
    });

    if (ev) {
      const lines = [
        `**${ev.title || ev.name}** — ${ev.date || ""}`,
        ev.description || "",
        ev.notes || "",
      ]
        .filter(Boolean)
        .join("\n");

      const out = `${opener}\n${formatBlock("Event Details", lines)}`;
      return out + maybeAddCloser(out);
    }
  }

  // Si no hay match específico, mostrar el "What’s On" general
  const body = bullets(sliceAfter("WHAT’S ON", context));
  const out = `${opener}\n${formatBlock("What’s On", body)}`;
  return out + maybeAddCloser(out);
}

    // CONTACT -----------------------------------------------------------------
    case "contact": {
      const out = `${opener}\n${formatBlock(
        "Contact Us",
        "• Email: hello@sunsets.space\n• SMS: 0475 229 525 (best for booking changes)\n• Support Hours: Thu–Sun during business hours.\n\nFor existing bookings, please text your name and booking date."
      )}\n\n)`;
      return out + maybeAddCloser(out);
    }

    // DRINKS & COCKTAILS ------------------------------------------------------
    // DRINKS RECOMMENDATIONS ------------------------------------------------------
    case "drinks_recommend": {
      const flavor = String(options?.flavor || "").toLowerCase();
      let title = "Signature Cocktails";
      if (flavor) title += ` — ${flavor.charAt(0).toUpperCase() + flavor.slice(1)}`;

      const COCKTAILS = [
        { name: "Basil Banga", desc: "Tanqueray Gin, Basil, Lemon, Coco Foam (Sweet)", tags: ["herbal", "sweet", "citrus"] },
        { name: "Oasis Margarita", desc: "Casamigos Blanco Tequila, Cointreau, Lime, Coconut (Tropical)", tags: ["tropical", "sweet", "citrus"] },
        { name: "Desert Rose", desc: "Tanqueray Gin, Lemon, Raspberry (Fruity)", tags: ["fruity", "sweet"] },
        { name: "Palm Springs", desc: "Vanilla Vodka, Mango, Passionfruit, Aperol (Fruity)", tags: ["fruity", "tropical"] },
        { name: "Island Breeze", desc: "White Rum, Coconut, Pineapple, Lime (Tropical)", tags: ["tropical", "sweet", "citrus"] },
        { name: "Spiced Pear", desc: "Tanqueray Gin, Pear, Lime, Cinnamon (Spicy)", tags: ["spicy", "fruity"] },
        { name: "Lychee Martini", desc: "Vodka, Lychee, Lemon (Fruity)", tags: ["fruity", "sweet"] },
        { name: "Espresso Martini", desc: "Vodka, Kahlua, Coffee (Bold)", tags: ["bitter"] },
      ];

      let filtered = COCKTAILS;
      if (flavor) {
        filtered = COCKTAILS.filter(c => c.tags.includes(flavor));
        if (!filtered.length) {
          if (flavor === "spicy") filtered = COCKTAILS.filter(c => c.tags.includes("bitter"));
          else if (flavor === "sweet") filtered = COCKTAILS.filter(c => c.tags.includes("fruity"));
          else filtered = COCKTAILS.slice(0, 4);
        }
      } else {
        filtered = COCKTAILS.slice(0, 5);
      }

      const list = filtered.map(c => `• **${c.name}** — ${c.desc}`).join("\n");
      const out = `${opener}\n${formatBlock(title, list)}\n\nOpen the full menu for wine & beer list (PDF).`;
      return out + maybeAddCloser(out);
    }

    case "drinks": {
      const out = `${opener}\n${formatBlock(
        "Signature Cocktails",
        "• **Basil Banga** — Tanqueray Gin, Basil, Lemon, Coco Foam (Sweet)\n• **Oasis Margarita** — Casamigos Blanco Tequila, Cointreau, Lime, Coconut (Tropical)\n• **Desert Rose** — Tanqueray Gin, Lemon, Raspberry (Fruity)\n• **Palm Springs** — Vanilla Vodka, Mango, Passionfruit, Aperol (Fruity)\n• **Island Breeze** — White Rum, Coconut, Pineapple, Lime (Tropical)\n• **Spiced Pear** — Tanqueray Gin, Pear, Lime, Cinnamon (Spicy)\n• **Lychee Martini** — Vodka, Lychee, Lemon (Fruity)\n• **Espresso Martini** — Vodka, Kahlua, Coffee (Bold)\n\n**Mocktails**\n• Watermelon Fresca — Watermelon, Passionfruit, Grenadine, Lemon, Soda\n• El Paradiso — Lychee, Passionfruit, Grapefruit, Bayleaf, Aquafaba\n• Coconut Tings — Pineapple, Coconut, Lime"
      )}\n\nOpen the full menu for wine & beer list (PDF).`;
      return out + maybeAddCloser(out);
    }

    case "dresscode": {
      const out = `${opener}\n${formatBlock(
        "Dress Code",
        "Our dress code is smart casual. We kindly ask guests to avoid thongs, singlets, and overly casual attire. Please dress to complement the relaxed yet elegant rooftop atmosphere."
      )}`;
      return out + maybeAddCloser(out);
    }

    // DRINKS (RECOMMENDATIONS) ---------------------------------------------------


    case "bottomless": {
      const body = sliceAfter("BOTTOMLESS SUNDAZE", context);
      const out = `${opener}\n${formatBlock("Bottomless Sundaze", body)}`;
      return out + maybeAddCloser(out);
    }

    // HANDOFF / MANAGER -------------------------------------------------------
    case "handoff_human": {
      return "I’m really sorry about this. Please text **0475 229 525** or email **hello@sunsets.space**, and our manager will contact you shortly.";
    }

    // GENERAL / DEFAULT -------------------------------------------------------
    case "thanks":
      return "You’re very welcome! If you need anything else, I’m here. 🌞";

    case "greeting":
      return "Hi! How can I help you today?";

    default:
      return "I can help with hours, location, bookings, menu, allergens, or events. What would you like to know?";
  }
}

// --- ✨ QUICK REPLIES (short chips) ---
export function quickReplies(intent) {
  const SUGGESTIONS = {
    general: ["Opening hours", "Menu", "Bookings", "Location", "Allergens", "Bottomless Sundaze", "What's on this weekend?"],
    hours: ["Do you open on Sundays?", "Do you open on public holidays?", "Kitchen hours on Saturday"],
    bookings: ["Deposit policy", "Cancellation policy", "Do you take walk-ins?"],
    payments: ["Do you take Amex?", "Can we split the bill?", "Is there a Sunday surcharge?"],
    contact: ["Text or call for changes?", "Support hours?"],
    private_event: ["Venue capacity?"],
    drinks: ["Signature cocktails", "Non-alcoholic options"],
    bottomless: ["Price for Bottomless?", "What’s included?"],
    events: ["Tell me about Riverfire", "Do you host private events?"],
  };

  const pool = SUGGESTIONS[intent] || SUGGESTIONS.general;
  return randomSubset(pool, 2);
}
