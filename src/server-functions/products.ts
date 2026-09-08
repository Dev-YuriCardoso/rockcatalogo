// Server functions to persist products owned by an authenticated user.
// The client only ever sees RPC stubs; all Supabase access stays on the server.
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  createSupabaseClientWithSession,
} from "@/integrations/supabase/supabaseClient.server";
import { readSessionCookie, writeSessionCookie } from "@/integrations/supabase/session.server";

const CATEGORIAS = ["Acessórios", "Camisas", "Calças", "Mochilas"] as const;

const ROUTE_ERROR_STATUS = 401;
const USER_ERROR_STATUS = 400;

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
      return { ok: false as const, error: "No autenticado." };
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