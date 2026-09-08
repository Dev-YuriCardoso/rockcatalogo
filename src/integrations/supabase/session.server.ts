// Server-only session helpers backed by an httpOnly cookie.
// The browser cannot read this cookie from JavaScript, so the Supabase
// access/refresh tokens never leak into client code.
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import type { SupabaseSession } from "./supabaseClient.server";

const SESSION_COOKIE = "rc_session";
const WEEK_SECONDS = 60 * 60 * 24 * 7;

function isSecure() {
  return process.env["NODE_ENV"] === "production";
}

export function readSessionCookie(): SupabaseSession | null {
  const raw = getCookie(SESSION_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SupabaseSession;
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionCookie(session: SupabaseSession) {
  setCookie(SESSION_COOKIE, JSON.stringify(session), {
    path: "/",
    maxAge: WEEK_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure(),
  });
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, { path: "/" });
}