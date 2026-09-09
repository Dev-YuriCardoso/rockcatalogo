// One-off maintenance function: creates (or resets) the admin account in the
// project owner's own Supabase project using their service role key.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import {
  EXTERNAL_SUPABASE_URL,
} from "@/integrations/supabase/supabaseClient.server";

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin@789";

export const bootstrapAdminUser = createServerFn({ method: "POST" }).handler(
  async () => {
    const serviceKey = process.env["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY"];
    if (!serviceKey) {
      return {
        ok: false as const,
        error: "EXTERNAL_SUPABASE_SERVICE_ROLE_KEY não configurada.",
      };
    }

    const admin = createClient(EXTERNAL_SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("apikey", serviceKey);
          headers.set("Authorization", `Bearer ${serviceKey}`);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: list, error: listError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) return { ok: false as const, error: listError.message };

    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === ADMIN_EMAIL,
    );

    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, action: "updated" as const, id: existing.id };
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      return { ok: false as const, error: error?.message ?? "Falha ao criar usuário." };
    }
    return { ok: true as const, action: "created" as const, id: data.user.id };
  },
);
