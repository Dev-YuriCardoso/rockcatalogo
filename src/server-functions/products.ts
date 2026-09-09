// Server functions to manage products. The client only ever sees RPC stubs;
// all Supabase access stays on the server.
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  createSupabaseClient,
  createSupabaseClientWithSession,
} from "@/integrations/supabase/supabaseClient.server";
import { readSessionCookie, writeSessionCookie } from "@/integrations/supabase/session.server";

const CATEGORIAS = ["Acessórios", "Camisas", "Calças", "Mochilas"] as const;

const ROUTE_ERROR_STATUS = 401;
const USER_ERROR_STATUS = 400;

export type AdminProduct = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  shopee_affiliate_link: string | null;
  created_at: string;
};

const PRODUCT_COLUMNS =
  "id,title,description,category,price,image_url,shopee_affiliate_link,created_at";

function isShopeeUrl(value: string): boolean {
  try {
    return new URL(value).hostname.toLowerCase().includes("shopee");
  } catch {
    return false;
  }
}

export const addProduct = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional().default(""),
      category: z.enum(CATEGORIAS),
      price: z.number().nonnegative(),
      imageUrl: z.string().url().optional().or(z.literal("")),
      link: z.string().url().optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    const session = readSessionCookie();
    if (!session) {
      setResponseStatus(ROUTE_ERROR_STATUS);
      return { ok: false as const, error: "Não autenticado." };
    }

    if (data.link && !isShopeeUrl(data.link)) {
      setResponseStatus(USER_ERROR_STATUS);
      return {
        ok: false as const,
        error: "O link de afiliado deve ser uma URL da Shopee (ex.: https://shopee.com.br/…).",
      };
    }

    const { client, session: fresh } = await createSupabaseClientWithSession(session);

    const { data: inserted, error } = await client
      .from("products")
      .insert({
        title: data.title,
        description: data.description || null,
        category: data.category,
        price: data.price,
        image_url: data.imageUrl || null,
        shopee_affiliate_link: data.link || null,
      })
      .select("id,title,created_at")
      .single();

    if (error) {
      setResponseStatus(USER_ERROR_STATUS);
      return { ok: false as const, error: error.message };
    }

    writeSessionCookie(fresh);
    return { ok: true as const, product: inserted };
  });

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  // Prefer the user's session (RLS `authenticated`); fall back to anon read,
  // which the public SELECT policy also allows.
  const session = readSessionCookie();
  if (session) {
    try {
      const { client, session: fresh } = await createSupabaseClientWithSession(session);
      const { data, error } = await client
        .from("products")
        .select(PRODUCT_COLUMNS)
        .order("created_at", { ascending: false });

      if (!error) {
        writeSessionCookie(fresh);
        return { ok: true as const, products: (data ?? []) as AdminProduct[] };
      }
      // On error (expired session etc.) fall through to the anon read below.
    } catch {
      // fall through
    }
  }

  const client = createSupabaseClient();
  const { data, error } = await client
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    setResponseStatus(USER_ERROR_STATUS);
    return { ok: false as const, error: error.message, products: [] as AdminProduct[] };
  }
  return { ok: true as const, products: (data ?? []) as AdminProduct[] };
});

export const deleteProduct = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = readSessionCookie();
    if (!session) {
      setResponseStatus(ROUTE_ERROR_STATUS);
      return { ok: false as const, error: "Não autenticado." };
    }

    const { client, session: fresh } = await createSupabaseClientWithSession(session);

    const { error } = await client.from("products").delete().eq("id", data.id);

    if (error) {
      setResponseStatus(USER_ERROR_STATUS);
      return { ok: false as const, error: error.message };
    }

    writeSessionCookie(fresh);
    return { ok: true as const };
  });

export type AdminLook = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  shopee_affiliate_link: string | null;
  created_at: string;
};

const LOOK_COLUMNS = "id,title,description,image_url,shopee_affiliate_link,created_at";

/** Public read of the curated "looks completos" (anonymous GET + session fallback). */
export const listLooks = createServerFn({ method: "GET" }).handler(async () => {
  const session = readSessionCookie();
  if (session) {
    try {
      const { client, session: fresh } = await createSupabaseClientWithSession(session);
      const { data, error } = await client
        .from("looks")
        .select(LOOK_COLUMNS)
        .order("created_at", { ascending: false });

      if (!error) {
        writeSessionCookie(fresh);
        return { ok: true as const, looks: (data ?? []) as AdminLook[] };
      }
    } catch {
      // fall through to anon read
    }
  }

  const client = createSupabaseClient();
  const { data, error } = await client
    .from("looks")
    .select(LOOK_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    setResponseStatus(USER_ERROR_STATUS);
    return { ok: false as const, error: error.message, looks: [] as AdminLook[] };
  }
  return { ok: true as const, looks: (data ?? []) as AdminLook[] };
});
