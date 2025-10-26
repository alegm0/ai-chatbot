// lib/chat/entities.js
// ======================================================
// 🌅 Entity detectors: Events + Diet tags (EN-only)
// Robust for AU locale (common typos, iOS quotes, etc.)
// ======================================================

// --- 🗓️ Event slug detection ---
export function detectEventSlug(text = "") {
  const t = String(text)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();

  // Key seasonal events (AU context)
  if (/\briver\s*fire\b/.test(t)) return "riverfire";
  if (/\bfather'?s?\s*day\b/.test(t)) return "fathers-day";
  if (/\bmother'?s?\s*day\b/.test(t)) return "mothers-day";
  if (/\b(bottomless|brunch|sundaze)\b/.test(t)) return "bottomless-brunch";
  if (/\bchristmas\b/.test(t)) return "christmas";
  if (/\bnew\s*year'?s?\s*eve\b|\bnye\b/.test(t)) return "new-years-eve";
  if (/\bvalentine'?s?\s*day\b/.test(t)) return "valentines-day";
  if (/\beaster\b/.test(t)) return "easter";
  if (/\banzac\s*day\b/.test(t)) return "anzac-day";

  // Optional future expansions
  if (/\bmelbourne\s*cup\b/.test(t)) return "melbourne-cup";
  if (/\bfriday\s*specials?\b/.test(t)) return "friday-specials";

  return null;
}

// --- 🥗 Diet tag detection ---
// Returns: { tags: Set<"gf"|"gfo"|"df"|"dfo"|"vg"|"v"|"nutfree">, matchMode: "and"|"or" }
export function detectDietTags(text = "") {
  const t = String(text)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();

  // Determine matching logic
  const matchMode = /\bor\b/.test(t) ? "or" : "and";
  const want = new Set();

  // --- Gluten-free ---
  if (/\b(gluten[-\s]?free|gf|glutten[-\s]?free)\b/.test(t)) want.add("gf");
  if (/\b(gluten[-\s]?free\s*option|gfo)\b/.test(t)) want.add("gfo");
  if (/\b(celiac|coeliac|celiac[s]?|coeliac[s]?)\b/.test(t)) want.add("gf");

  // --- Dairy-free / Lactose-free ---
  if (/\b(dairy[-\s]?free|df|lactose[-\s]?free|dary[-\s]?free)\b/.test(t)) want.add("df");
  if (/\b(dairy[-\s]?free\s*option|dfo)\b/.test(t)) want.add("dfo");

  // --- Vegan / Vegetarian ---
  const isVegan = /\bvegans?\b|\bvegan\b|\bvg\b/i.test(t);
  const isVegetarian = /\bvegetarians?\b|\bvegetarian\b|\bveggies?\b|\bveg\b(?!\s*an)\b|\bv\b(?!\s*g)\b/i.test(t);

  if (isVegan) {
    want.add("vg");       // Solo VG
  } else if (isVegetarian) {
    want.add("v");        // Solo V
  }
  // --- Nut-free ---
  if (/\b(nut[-\s]?free|peanut[-\s]?free|no\s*nuts?)\b/.test(t)) want.add("nutfree");

  return { tags: want, matchMode };
}
