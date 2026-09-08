// Server functions for authentication. All Supabase credentials live on the
// server only; these functions are exposed to the client as RPC stubs.
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { createSupabaseClient, createSupabaseClientWithSession } from "@/integrations/supabase/supabaseClient.server";
import {
  readSessionCookie,
  writeSessionCookie,
  clearSessionCookie,
} from "@/integrations/supabase/session.server";

export type PublicUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
};

const USER_ERROR_STATUS = 400;

function toPublicUser(user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email ?? "",
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
}

export const signUp = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = createSupabaseClient();
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setResponseStatus(USER_ERROR_STATUS);
      return { ok: false as const, error: error.message };
    }

    if (result.session) {
      writeSessionCookie({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        expires_at: result.session.expires_at,
      });
    }

    return {
      ok: true as const,
      user: toPublicUser(result.user ?? { id: "" }),
      confirmationRequired: !result.session,
    };
  });

export const signIn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = createSupabaseClient();
    const { data: result, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error || !result.session) {
      setResponseStatus(USER_ERROR_STATUS);
      return {
        ok: false as const,
        error: error?.message ?? "Credenciais inválidas.",
      };
    }

    writeSessionCookie({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
      expires_at: result.session.expires_at,
    });

    return { ok: true as const, user: toPublicUser(result.user) };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = readSessionCookie();
  if (session) {
    try {
      const supabase = createSupabaseClient();
      await supabase.auth.signOut({
        scope: "local",
        // A stale token still lets signOut succeed client-side; we ignore errors.
      });
    } catch {
      // ignore
    }
  }
  clearSessionCookie();
  return { ok: true as const };
});

export const getSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = readSessionCookie();
  if (!session) return null;

  try {
    const { client, session: fresh } = await createSupabaseClientWithSession(session);
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      clearSessionCookie();
      return null;
    }

    // Session tokens may have been refreshed by setSession -> persist them back.
    writeSessionCookie(fresh);
    return toPublicUser(data.user);
  } catch {
    clearSessionCookie();
    return null;
  }
});