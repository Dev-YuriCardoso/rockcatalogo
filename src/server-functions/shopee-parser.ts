// Pure parsing helpers to extract product info from a Shopee page (or a
// rendered text snapshot of it). No external imports on purpose: keep this
// module testable standalone (`node --experimental-strip-types`) and safe to
// import from server functions only.

export const CATEGORIAS = ["Acessórios", "Camisas", "Calças", "Mochilas"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type ScrapedProduct = {
  title: string;
  /** Price already normalized to BRL units (reais), not cents. */
  price: number | null;
  currency: string;
  description: string;
  images: readonly string[];
  /** Raw category text found on the page (shop/site category names). */
  categoryHint: string;
};

const SHOPEE_IMG = "https://down-pic.shopeeimg.com";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asStringArray(v: unknown): readonly unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Removes HTML tags, collapses whitespace and bounds the length. */
export function cleanDescription(value: string, max = 1000): string {
  let text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\\u003c?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > max) text = `${text.slice(0, max)}…`;
  return text;
}

/** Normalizes a single Shopee image reference to an absolute https URL. */
export function normalizeImageUrl(raw: unknown): string {
  const value = asString(raw).trim();
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${SHOPEE_IMG}${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SHOPEE_IMG}/${value}`;
}

/**
 * Accepts the many shapes Shopee uses for the image list:
 *   ["https://...jpg", "abc/def.jpg", { full_name: "abc/def.jpg" }, ...]
 */
export function normalizeImages(raw: unknown): readonly string[] {
  const out: string[] = [];
  const push = (u: unknown) => {
    const norm = normalizeImageUrl(u);
    if (norm && !out.includes(norm)) out.push(norm);
  };

  for (const entry of asStringArray(raw)) {
    if (typeof entry === "string") {
      push(entry);
    } else if (isRecord(entry)) {
      // Prefer the full-size variant; Shopee uses `full_name` for the big one.
      push(entry["full_name"]);
      push(entry["image_url"]);
      push(entry["url"]);
      push(entry["name"]);
    }
  }
  return out;
}

/**
 * Parses a free-form Brazilian price string like "R$ 129,90", "1.299,90",
 * "1299.90" or "129.90". Returns null when nothing numeric is found.
 */
export function parseBRLPriceText(input: string): number | null {
  const text = input.replace(/\s+/g, "");
  if (!text) return null;

  const m = text.match(/R\$\s*(\d[\d.,]*)/i) ?? text.match(/(\d[\d.,]*)\s*r(?:eais)?/i);
  const raw = m?.[1] ?? text;
  return parseDecimal(raw);
}

function parseDecimal(raw0: string): number | null {
  const s = raw0.replace(/[^\d.,]/g, "");
  if (!s || s === "." || s === ",") return null;

  const dot = s.lastIndexOf(".");
  const comma = s.lastIndexOf(",");
  const hasDot = dot >= 0;
  const hasComma = comma >= 0;

  if (hasDot && hasComma) {
    const sep = Math.max(dot, comma);
    const intPart = s.slice(0, sep).replace(/[.,]/g, "");
    const decPart = s.slice(sep + 1);
    if (decPart.length <= 2) return parseFloat(`${intPart}.${decPart}`);
    // "1.299,90" style handled above; longer dec parts are thousand separators
    return parseFloat(intPart + decPart);
  }

  const sepIdx = hasDot ? dot : comma;
  if (sepIdx < 0) return parseFloat(s);

  const intPart = s.slice(0, sepIdx);
  const decPart = s.slice(sepIdx + 1);
  if (decPart.length === 3 && intPart.length >= 2) {
    // "1.299" / "12.500" -> thousands separator
    return parseFloat(intPart + decPart);
  }
  if (decPart.length <= 2) {
    return parseFloat(`${intPart}.${decPart}`);
  }
  return parseFloat(intPart + decPart);
}

/** Shopee's server-side price is an integer in cents (unit price * 100). */
export function centsToBRL(cents: number | null): number | null {
  if (cents === null) return null;
  const rounded = Math.round(cents) / 100;
  return Math.round(rounded * 100) / 100;
}

// ---------------------------------------------------------------------------
// __INITIAL_STATE__ extraction
// ---------------------------------------------------------------------------

/** Finds the `window.__INITIAL_STATE__ = {...};` blob and parses it. */
export function extractInitialState(html: string): unknown | null {
  const marker = "window.__INITIAL_STATE__";
  const at = html.indexOf(marker);
  if (at < 0) return null;

  const eq = html.indexOf("=", at);
  if (eq < 0) return null;

  let start = eq + 1;
  while (start < html.length && (html[start] === " " || html[start] === "\n" || html[start] === "\r")) start++;
  if (html[start] !== "{") return null;

  let depth = 0;
  let inStr = false;
  let esc = false;
  let i = start;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) return null;

  try {
    return JSON.parse(html.slice(start, i + 1));
  } catch {
    return null;
  }
}

type ItemRecord = Record<string, unknown>;

/**
 * BFS over the state JSON looking for product-item shaped objects. Prefers
 * objects that look like a full product (name + price + images).
 */
export function findItemShapes(root: unknown, limit = 20): readonly ItemRecord[] {
  const found: ItemRecord[] = [];
  const queue: { v: unknown; d: number }[] = [{ v: root, d: 0 }];
  let guard = 0;

  while (queue.length > 0 && found.length < limit && guard < 500_000) {
    guard++;
    const { v, d } = queue.shift() as { v: unknown; d: number };
    if (d > 9) continue;
    if (isRecord(v)) {
      const name = asString(v["name"]);
      const price = v["price"];
      const hasImages =
        (Array.isArray(v["images"]) && (v["images"] as unknown[]).length > 0) ||
        typeof v["image"] === "string";
      if (name.length > 0 && (typeof price === "number" || hasImages)) {
        found.push(v);
        continue;
      }
      for (const child of Object.values(v)) {
        if (child !== null && typeof child === "object") queue.push({ v: child, d: d + 1 });
      }
    } else if (Array.isArray(v)) {
      for (const child of v) {
        if (child !== null && typeof child === "object") queue.push({ v: child, d: d + 1 });
      }
    }
  }
  return found;
}

function bestItem(items: readonly ItemRecord[]): ItemRecord | null {
  if (items.length === 0) return null;
  const score = (it: ItemRecord) => {
    let s = 0;
    if (typeof it["price"] === "number") s += 2;
    if (Array.isArray(it["images"])) s += 2;
    if (typeof it["itemid"] === "number") s += 1;
    if (typeof it["shopid"] === "number") s += 1;
    if (asString(it["name"]).length > 3) s += 2;
    return s;
  };
  let best = items[0] as ItemRecord;
  for (const it of items) if (score(it) > score(best)) best = it;
  return best;
}

function itemToScraped(item: ItemRecord): ScrapedProduct | null {
  const title = cleanDescription(asString(item["name"]), 200);
  if (!title) return null;

  const price = centsToBRL(asNumber(item["price"])) ?? centsToBRL(asNumber(item["price_min"]));

  let images = normalizeImages(item["images"]);
  if (images.length === 0) {
    for (const key of ["image", "s_image", "m_image", "cover", "video_cover"]) {
      images = normalizeImages([item[key]]);
      if (images.length > 0) break;
    }
  }

  const hints: string[] = [];
  for (const cat of asStringArray(item["categories"])) {
    if (isRecord(cat)) {
      const name = asString(cat["display_name"]).trim();
      if (name) hints.push(name);
    }
  }

  return {
    title,
    price,
    currency: asString(item["currency"]) || "BRL",
    description: cleanDescription(asString(item["description"]), 400),
    images,
    categoryHint: hints.join(", "),
  };
}

/** Full pipeline over the raw page HTML using the embedded JSON state. */
export function extractFromInitialState(html: string): ScrapedProduct | null {
  const state = extractInitialState(html);
  if (state === null) return null;
  const item = bestItem(findItemShapes(state));
  return item ? itemToScraped(item) : null;
}

// ---------------------------------------------------------------------------
// OpenGraph / meta tags
// ---------------------------------------------------------------------------

function metaContent(html: string, property: string): string {
  const esc = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]*content=["']([^"']*)["']`, "i"),
  ) ??
    html.match(
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${esc}["']`, "i"),
    );
  return m ? m[1] as string : "";
}

/** Fallback path: products often expose og:title / og:image / product:price. */
export function extractFromOpenGraph(html: string): ScrapedProduct | null {
  const title = metaContent(html, "og:title") ||
    (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");
  const image = metaContent(html, "og:image");
  const description = metaContent(html, "og:description");
  const priceRaw =
    metaContent(html, "product:price:amount") || metaContent(html, "product:price:amount:value");
  const currency = metaContent(html, "product:price:currency");

  const cleanedTitle = cleanDescription(title, 200);
  if (!cleanedTitle && !image && !priceRaw) return null;

  return {
    title: cleanedTitle || "Producto de Shopee",
    price: parseBRLPriceText(priceRaw) ?? (priceRaw ? parseFloat(priceRaw.replace(",", ".")) : null),
    currency: currency || "BRL",
    description: cleanDescription(description, 400),
    images: image ? [normalizeImageUrl(image)] : [],
    categoryHint: "",
  };
}

// ---------------------------------------------------------------------------
// Reader / rendered-text fallback (e.g. Jina Reader markdown)
// ---------------------------------------------------------------------------

const READER_STOPWORDS =
  /cookies|aceptar|configuraci|selecciona|idioma|entrar|ayuda|login|iniciar sesi|parece|todav|ir al contenido|volver a la p/i;

/** Best-effort extraction from a rendered text/markdown snapshot. */
export function extractFromReaderText(text: string): ScrapedProduct | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = "";
  const titleLine = lines.find((l) => /^Title:\s?/i.test(l));
  if (titleLine) {
    title = titleLine.replace(/^Title:\s?/i, "");
  } else {
    for (const line of lines) {
      const clean = line.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim();
      if (clean.length >= 8 && clean.length <= 200 && !READER_STOPWORDS.test(clean) && !/^https?:\/\//i.test(clean)) {
        title = clean;
        break;
      }
    }
  }

  const price = parseBRLPriceText(text);
  const imagesMarkdown = [...text.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)\)/g)].map((m) => m[1] as string);
  const imagesFromTags = [...text.matchAll(/<img[^>]+src=["'](https?:[^"']+)["']/gi)].map((m) => m[1] as string);

  title = cleanDescription(title, 200);
  if (!title && !price && imagesMarkdown.length === 0 && imagesFromTags.length === 0) return null;

  const images = normalizeImages(imagesMarkdown.length > 0 ? imagesMarkdown : imagesFromTags);

  return {
    title: title || "Producto de Shopee",
    price,
    currency: "BRL",
    description: "",
    images,
    categoryHint: "",
  };
}

// ---------------------------------------------------------------------------
// Category classification
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: ReadonlyArray<readonly [Categoria, readonly string[]]> = [
  [
    "Camisas",
    ["camis", "shirt", "tshirt", "t-shirt", "playera", "polera", "blusa", "blouse", "remera", "jersey", "camisa", "camiseta", "boxy"],
  ],
  [
    "Calças",
    ["calza", "pantal", "pants", "jean", "legging", "jogger", "bermuda", "shorts", "trouser", "calças", "calca"],
  ],
  [
    "Mochilas",
    ["mochila", "backpack", "back pack", "morral", "rucksack", "knapsack"],
  ],
  [
    "Acessórios",
    ["gorra", "cap", "sombrero", "hat", "lente", "gafas", "glass", "collar", "cadena", "chain", "anillo", "ring", "pulsera", "bracelet", "brazalete", "cintur", "belt", "reloj", "watch", "arete", "pendiente", "earring", "bufanda", "scarf", "bolso", "bolsa", "billetera", "wallet", "cartera", "accesorio", "accessor", "choker", "gargantilla", "colgante", "pendant", "dije", "argolla", "accesorios"],
  ],
];

/** Detects the catalog category from free text (name + description). */
export function classifyCategory(...parts: readonly string[]): Categoria {
  const text = parts
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  let best = "Acessórios" as Categoria;
  let bestPos = Number.MAX_SAFE_INTEGER;
  for (const [categoria, words] of CATEGORY_KEYWORDS) {
    for (const word of words) {
      const pos = text.indexOf(word);
      if (pos >= 0 && pos < bestPos) {
        bestPos = pos;
        best = categoria;
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Link helpers
// ---------------------------------------------------------------------------

/** Extracts itemid / shopid from a Shopee product URL when present. */
export function parseShopeeLinkIds(
  link: string,
): { itemid: string | null; shopid: string | null } | null {
  if (!link) return null;

  const direct = link.match(/-i\.(\d{4,})\.(\d{4,})/);
  if (direct) {
    return { itemid: direct[1] as string, shopid: direct[2] as string };
  }

  try {
    const u = new URL(link);
    const itemid = u.searchParams.get("itemid");
    const shopid = u.searchParams.get("shopid");
    if (itemid || shopid) return { itemid, shopid };
  } catch {
    return null;
  }
  return { itemid: null, shopid: null };
}

/**
 * Accepts product links (shopee.com.br/…) and affiliate short links
 * (s.shopee.com.br/…, shp.ee/…). Anything clearly not Shopee is rejected.
 */
export function isShopeeUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host.includes("shopee") || host.includes("shp.ee");
  } catch {
    return false;
  }
}