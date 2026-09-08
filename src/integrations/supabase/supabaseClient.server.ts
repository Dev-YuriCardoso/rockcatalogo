// Server-only Supabase client factory.
// SECURITY: this module reads credentials from process.env (server side) and
// is ONLY ever imported dynamically inside server-function handlers. It must
// never be statically imported from files that ship to the client bundle.
import { createClient } from "@supabase/supabase-js";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// New-format Supabase keys are opaque strings, not JWTs. supabase-js sends
// them as `Authorization: Bearer <key>` which PostgREST rejects, so we strip
// that header and send the value exclusively as the `apikey` header instead.
function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function getServerEnv() {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(
      `[Supabase] Missing server environment variable(s): ${missing.join(", ")}.`,
    );
  }

  return { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
}

/**
 * Basic client with the publishable key (no user session). Safe to use for
 * auth-only operations (sign up / sign in) where no RLS user is needed yet.
 */
export function createSupabaseClient() {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = getServerEnv();

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number | undefined;
};

/**
 * Client bound to a real authenticated user's session. The session is applied
 * with setSession so expiring access tokens are automatically refreshed and
 * PostgREST requests carry the user JWT -> RLS grants the "authenticated" role.
 */
export async function createSupabaseClientWithSession(session: SupabaseSession) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = getServerEnv();

  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error || !data.session) {
    throw new Error("Sesión inválida o expirada. Vuelve a iniciar sesión.");
  }

  // Reflect refreshed tokens so callers can persist them back to the cookie.
  const freshSession: SupabaseSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };

  return { client, session: freshSession, user: data.user };
}