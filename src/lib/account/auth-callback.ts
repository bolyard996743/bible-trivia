export const AUTH_NEXT_PATHS = ["/account", "/auth/update-password", "/home"] as const;

export const EMAIL_OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;
export type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

export type AuthCallbackPlan =
  | { kind: "exchange"; code: string; next: string }
  | { kind: "verify"; tokenHash: string; otpType: EmailOtpType; next: string }
  | { kind: "session"; next: string }
  | { kind: "error"; message: string };

const LINK_EXPIRED = "That link has expired or was already used. Request a new one.";
const LINK_UNUSABLE = "That link could not be used. Request a new one from this browser.";

/** Only in-app paths we actually have. Anything else, including another site, stays on the account page. */
export function safeNextPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\") || trimmed.includes("://")) {
    return fallback;
  }
  const path = trimmed.split("?")[0]?.split("#")[0] ?? fallback;
  return (AUTH_NEXT_PATHS as readonly string[]).includes(path) ? path : fallback;
}

function paramsFrom(search: string, hash: string): { query: URLSearchParams; fragment: URLSearchParams } {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fragment = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return { query, fragment };
}

function first(query: URLSearchParams, fragment: URLSearchParams, key: string): string {
  return query.get(key) || fragment.get(key) || "";
}

function isOtpType(value: string): value is EmailOtpType {
  return (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

function linkErrorMessage(code: string): string {
  const normalized = code.toLowerCase();
  if (normalized.includes("expired") || normalized.includes("otp_expired")) return LINK_EXPIRED;
  return LINK_UNUSABLE;
}

/**
 * Decides what the confirmation or reset link should do.
 * Error text from the provider is never returned.
 */
export function planAuthCallback(search: string, hash = ""): AuthCallbackPlan {
  const { query, fragment } = paramsFrom(search, hash);
  const errorCode = first(query, fragment, "error_code").toLowerCase();
  const error = first(query, fragment, "error");
  if (error || errorCode) {
    return { kind: "error", message: linkErrorMessage(errorCode || error) };
  }

  const requested = safeNextPath(query.get("next") || fragment.get("next"));
  const code = first(query, fragment, "code");
  if (code) return { kind: "exchange", code, next: requested };

  const tokenHash = first(query, fragment, "token_hash");
  const type = first(query, fragment, "type").toLowerCase();
  if (tokenHash && isOtpType(type)) {
    const next = type === "recovery" ? "/auth/update-password" : requested;
    return { kind: "verify", tokenHash, otpType: type, next };
  }

  if (fragment.get("access_token") || type === "recovery") {
    return { kind: "session", next: type === "recovery" ? "/auth/update-password" : requested };
  }

  return { kind: "session", next: requested };
}
