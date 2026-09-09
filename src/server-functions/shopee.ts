// Server functions to import a product from a Shopee link automatically.
// Flow: link -> fetch page/reader -> parse -> download photo -> upload to
// Supabase Storage -> insert row in `products` (all through Supabase).
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readSessionCookie, writeSessionCookie } from "@/integrations/supabase/session.server";
import {
  createSupabaseClientWithSession,
} from "@/integrations/supabase/supabaseClient.server";
import { EXTERNAL_SUPABASE_URL } from "@/integrations/supabase/supabaseClient.server";
import {
  CATEGORIAS,
  classifyCategory,
  extractFromInitialState,
  extractFromOpenGraph,
  extractFromReaderText,
  isShopeeUrl,
  normalizeImageUrl,
  parseShopeeLinkIds,
  type Categoria,
  type ScrapedProduct,
} from "./shopee-parser";

const ROUTE_ERROR_STATUS = 401;
const USER_ERROR_STATUS = 400;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Cache-Control": "no-cache",
};

// ---------------------------------------------------------------------------
// Networking helpers
// ---------------------------------------------------------------------------

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), FETCH_TIMEOUT_MS);
  });
  return Promise.race([fetch(url, init), timeout]);
}

async function fetchPageText(url: string): Promise<{ ok: boolean; status: number; finalUrl: string; text: string }> {
  const res = await fetchWithTimeout(url, { headers: BROWSER_HEADERS, redirect: "follow" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, finalUrl: res.url, text };
}

function describeBadStatus(status: number): string {
  if (status === 403 || status === 429) {
    return "Shopee bloqueó la solicitud (protección antibot). Verifica que el enlace sea de un producto y reintenta; si persiste, prueba con un enlace corto s.shopee.com.br/…";
  }
  return `Shopee respondió con el estado ${status}.`;
}

function normalizeLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// ---------------------------------------------------------------------------
// Extraction pipeline
// ---------------------------------------------------------------------------

export type ImportStream = "pagina" | "metadatos" | "lector";

function fallbackTitle(link: string): string {
  const ids = parseShopeeLinkIds(link);
  if (ids?.itemid) return `Producto de Shopee #${ids.itemid}`;
  return "Producto de Shopee";
}

type ReadResult =
  | { ok: true; product: ScrapedProduct; source: ImportStream }
  | { ok: false; error: string };

const NO_DATA_MSG =
  "No se pudo extraer la información del producto (Shopee bloquea la lectura automática desde este servidor). " +
  "Puedes guardar el producto igualmente y completar los datos, o usar el botón \"Importar y publicar\" que rellena lo que pueda.";

async function readProductFromLink(link: string): Promise<ReadResult> {
  try {
    const page = await fetchPageText(link);
    if (!page.ok) {
      return { ok: false, error: describeBadStatus(page.status) };
    }

    const fromState = extractFromInitialState(page.text);
    if (fromState) return { ok: true, product: fromState, source: "pagina" };

    const fromOg = extractFromOpenGraph(page.text);
    if (fromOg) return { ok: true, product: fromOg, source: "metadatos" };

    // Last resort: render the page via a reader service (default: Jina Reader).
    try {
      const readerBase = process.env["SHOPEE_READER_URL"] || "https://r.jina.ai/";
      const readerUrl = `${readerBase}${encodeURIComponent(page.finalUrl || link)}`;
      const rr = await fetchWithTimeout(readerUrl, {
        headers: { "X-Return-Format": "text" },
      });
      if (rr.ok) {
        const fromReader = extractFromReaderText(await rr.text());
        if (fromReader) return { ok: true, product: fromReader, source: "lector" };
      }
    } catch {
      // reader unreachable: fall through
    }

    return { ok: false, error: NO_DATA_MSG };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `No se pudo conectar con Shopee: ${reason}` };
  }
}

// ---------------------------------------------------------------------------
// Image re-hosting to Supabase Storage (best effort)
// ---------------------------------------------------------------------------

function extForContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  return map[contentType.toLowerCase()] ?? map[contentType.split("/")[0] ?? ""] ?? "jpg";
}

async function rehostImageToStorage(
  remoteUrl: string,
  sessionClient: Awaited<ReturnType<typeof createSupabaseClientWithSession>>["client"],
): Promise<{ url: string; warning: string }> {
  const href = normalizeImageUrl(remoteUrl);
  if (!href) return { url: "", warning: "" };
  if (href.includes("supabase.co/storage/v1/object")) {
    return { url: href, warning: "" };
  }

  let bytes: ArrayBuffer;
  try {
    const res = await fetchWithTimeout(href, { headers: BROWSER_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("imagen demasiado grande (máx. 8 MB)");
    }
  } catch {
    return {
      url: href,
      warning:
        "No se pudo descargar la foto para guardarla en Supabase; se usó la URL original de Shopee (puede caducar con el tiempo).",
    };
  }

  const fileName = `products/${randomUUID()}.jpg`;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await supabaseAdmin.storage.createBucket("product-images", { public: true });
    } catch {
      // The bucket already exists.
    }
    const { error } = await supabaseAdmin.storage
      .from("product-images")
      .upload(fileName, bytes, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });

    if (!error) {
      return { url: `${EXTERNAL_SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`, warning: "" };
    }
  } catch {
    // Service-role client unavailable (missing env in local dev) -> try user client below.
  }

  try {
    const { error } = await sessionClient.storage
      .from("product-images")
      .upload(fileName, bytes, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
    if (!error) {
      return { url: `${EXTERNAL_SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`, warning: "" };
    }
  } catch {
    // fall through
  }

  return {
    url: href,
    warning:
      "No se pudo subir la foto a Supabase Storage; se usó la URL original de Shopee (puede caducar con el tiempo).",
  };
}

// ---------------------------------------------------------------------------
// Public server functions (exposed to the client as RPC stubs)
// ---------------------------------------------------------------------------

export type ShopeeFetchResult = {
  ok: boolean;
  title?: string;
  description?: string;
  category?: Categoria;
  price?: number | null;
  imageUrl?: string;
  source?: ImportStream;
  warnings?: string[];
  error?: string;
};

const isAuthenticated = () => {
  const session = readSessionCookie();
  if (!session) {
    setResponseStatus(ROUTE_ERROR_STATUS);
    return { session: null };
  }
  return { session };
};

/** Step 1 — preview: fetch the product data from a Shopee link. */
export const fetchShopeeProduct = createServerFn({ method: "POST" })
  .validator(z.object({ link: z.string().min(1).max(1500) }))
  .handler(async ({ data }) => {
    const { session } = isAuthenticated();
    if (!session) return { ok: false as const, error: "Não autenticado." };

    const link = normalizeLink(data.link);
    if (!isShopeeUrl(link)) {
      setResponseStatus(USER_ERROR_STATUS);
      return {
        ok: false as const,
        error: "El enlace debe ser de Shopee (shopee.com.br/… o s.shopee.com.br/…).",
      };
    }

    const result = await readProductFromLink(link);
    if (!result.ok) {
      setResponseStatus(USER_ERROR_STATUS);
      return { ok: false as const, error: result.error };
    }

    const product = result.product;
    const warnings: string[] = [];
    if (result.source === "lector") {
      warnings.push("Shopee bloqueó la lectura directa; se usó un lector web. Revisa los datos antes de publicar.");
    }
    if (!product.price) {
      warnings.push("No se detectó el precio automáticamente; revísalo antes de guardar.");
    }

    return {
      ok: true as const,
      title: product.title,
      description: product.description,
      category: classifyCategory(product.title, product.description, product.categoryHint),
      price: product.price,
      imageUrl: product.images[0] ?? "",
      source: result.source,
      warnings,
    };
  });

/**
 * Step 2 — automatic import: fetch (if data not provided) -> re-host the photo
 * in Supabase Storage -> insert the row in `products` -> done.
 */
export const importShopeeProduct = createServerFn({ method: "POST" })
  .validator(
    z.object({
      link: z.string().min(1).max(1500),
      title: z.string().max(200).optional(),
      description: z.string().max(1000).optional(),
      category: z.enum(CATEGORIAS).optional(),
      price: z.number().nonnegative().optional(),
      imageUrl: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { session } = isAuthenticated();
    if (!session) return { ok: false as const, error: "Não autenticado." };

    const link = normalizeLink(data.link);
    if (!isShopeeUrl(link)) {
      setResponseStatus(USER_ERROR_STATUS);
      return {
        ok: false as const,
        error: "El enlace debe ser de Shopee (shopee.com.br/… o s.shopee.com.br/…).",
      };
    }

    // Auto-extraction: any field not explicitly passed is derived from the link.
    let product: ScrapedProduct | null = null;
    const needsFetch = !data.title || data.price === undefined || !data.imageUrl;
    if (needsFetch) {
      const result = await readProductFromLink(link);
      if (result.ok) product = result.product;
    }

    const title = (data.title?.trim() || product?.title.trim() || fallbackTitle(link)).slice(0, 200);
    const price = data.price ?? product?.price ?? 0;
    const description = (data.description?.trim() || product?.description || "").slice(0, 1000);
    const category: Categoria =
      data.category ??
      (product ? classifyCategory(product.title, product.description, product.categoryHint) : "Acessórios");
    let imageUrl = data.imageUrl ?? product?.images[0] ?? "";

    const { client, session: fresh } = await createSupabaseClientWithSession(session);
    const warnings: string[] = [];
    if (imageUrl) {
      const rehosted = await rehostImageToStorage(imageUrl, client);
      imageUrl = rehosted.url;
      if (rehosted.warning) warnings.push(rehosted.warning);
    }

    const { data: inserted, error } = await client
      .from("products")
      .insert({
        title,
        description: description || null,
        category,
        price,
        image_url: imageUrl || null,
        shopee_affiliate_link: link,
      })
      .select("id,title,created_at")
      .single();

    if (error) {
      setResponseStatus(USER_ERROR_STATUS);
      return { ok: false as const, error: error.message };
    }

    writeSessionCookie(fresh);
    return { ok: true as const, product: inserted, warnings };
  });