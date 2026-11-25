export const PASSWORD_RULE = "Use a password of at least 8 characters.";
export const USERNAME_TAKEN = "That username is already taken.";
export const EMAIL_REGISTERED = "That email is already registered. Sign in instead.";
export const SERVER_ERROR = "Something went wrong on our end, please try again.";
export const CONFIRM_EMAIL_MESSAGE = "Check your email to confirm your account, then come back and sign in.";
export const WRONG_PASSWORD = "That email or password isn't right. Try again.";
export const UNCONFIRMED_EMAIL =
  "Confirm your email before signing in. Check your inbox for the message we sent.";
export const RATE_LIMIT_MESSAGE = "Too many tries just now. Wait a little while, then try again.";
export const NETWORK_ERROR = "We couldn't reach the server. Check your connection and try again.";
export const RESET_EMAIL_SENT =
  "If an account uses that email, we sent a link to choose a new password.";
export const PASSWORD_UPDATED = "Your password is updated. You can keep going.";
export const LINK_EXPIRED = "That link has expired or was already used. Request a new one.";
export const LINK_UNUSABLE = "That link could not be used. Request a new one from this browser.";
export const RESET_LINK_NEEDED =
  "Open the reset link from your email on this browser, or request a new one.";
export const PASSWORD_REUSED = "Choose a different password from the one you use now.";

function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "";
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  return typeof error.status === "number" ? error.status : null;
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return typeof error.code === "string" ? error.code.toLowerCase() : "";
}

function errorName(error: unknown): string {
  if (!error || typeof error !== "object" || !("name" in error)) return "";
  return typeof error.name === "string" ? error.name : "";
}

export function isNetworkError(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  const name = errorName(error);
  if (name === "TypeError" || name === "AuthRetryableFetchError") {
    if (/fetch|network|load failed|failed/.test(message)) return true;
  }
  return /failed to fetch|networkerror|network request failed|load failed|network error|authretryablefetcherror/.test(
    message,
  );
}

export function isRateLimitError(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  const code = errorCode(error);
  const status = errorStatus(error);
  return (
    status === 429 ||
    code.includes("rate_limit") ||
    /rate limit|too many requests|over_request_rate_limit|over_email_send_rate_limit|email rate limit/.test(message)
  );
}

function isWeakPassword(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  const code = errorCode(error);
  return (
    code === "weak_password" ||
    message.includes("weak password") ||
    message.includes("password should be at least") ||
    message.includes("password is too short") ||
    /at least \d+ character/.test(message)
  );
}

function isAlreadyRegistered(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  const code = errorCode(error);
  return (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists") ||
    message.includes("email address is already")
  );
}

function isUsernameTaken(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  return (
    (message.includes("username") && /taken|unique|duplicate|already/.test(message)) ||
    (message.includes("duplicate key") && message.includes("username"))
  );
}

function isUnconfirmed(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  const code = errorCode(error);
  return code === "email_not_confirmed" || message.includes("email not confirmed") || message.includes("not confirmed");
}

function isInvalidCredentials(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  const code = errorCode(error);
  return (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password") ||
    message.includes("wrong password") ||
    message.includes("email or password")
  );
}

function isMissingUser(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  const code = errorCode(error);
  return code === "user_not_found" || message.includes("user not found") || message.includes("user doesn't exist");
}

function isSamePassword(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  const code = errorCode(error);
  return code === "same_password" || message.includes("should be different");
}

function isServerFailure(error: unknown): boolean {
  const status = errorStatus(error);
  return status != null && status >= 500;
}

/** Sign-up failures get a specific message. They never ask the player to recheck a generic login. */
export function signupErrorMessage(error: unknown): string {
  if (isAlreadyRegistered(error)) return EMAIL_REGISTERED;
  if (isWeakPassword(error)) return PASSWORD_RULE;
  if (isUsernameTaken(error)) return USERNAME_TAKEN;
  if (isRateLimitError(error)) return RATE_LIMIT_MESSAGE;
  if (isNetworkError(error)) return NETWORK_ERROR;
  if (isServerFailure(error)) return SERVER_ERROR;
  return SERVER_ERROR;
}

/**
 * Sign-in failures. An unknown email and a wrong password share one sentence,
 * because Supabase uses the same error for both.
 */
export function signInErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_ERROR;
  if (isRateLimitError(error)) return RATE_LIMIT_MESSAGE;
  if (isUnconfirmed(error)) return UNCONFIRMED_EMAIL;
  if (isInvalidCredentials(error) || isMissingUser(error)) return WRONG_PASSWORD;
  if (isWeakPassword(error)) return PASSWORD_RULE;
  return SERVER_ERROR;
}

/**
 * A missing account gets the same sentence as a real send, so the form does
 * not say whether that email is registered.
 */
export function passwordResetFeedback(error: unknown | null): { ok: boolean; message: string } {
  if (!error || isMissingUser(error)) return { ok: true, message: RESET_EMAIL_SENT };
  if (isNetworkError(error)) return { ok: false, message: NETWORK_ERROR };
  if (isRateLimitError(error)) return { ok: false, message: RATE_LIMIT_MESSAGE };
  return { ok: false, message: SERVER_ERROR };
}

export function updatePasswordErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_ERROR;
  if (isRateLimitError(error)) return RATE_LIMIT_MESSAGE;
  if (isWeakPassword(error)) return PASSWORD_RULE;
  if (isSamePassword(error)) return PASSWORD_REUSED;
  return SERVER_ERROR;
}

export function callbackFailureMessage(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_ERROR;
  if (isRateLimitError(error)) return RATE_LIMIT_MESSAGE;
  const code = errorCode(error);
  const message = errorText(error).toLowerCase();
  if (code.includes("expired") || code.includes("flow_state") || message.includes("expired") || message.includes("already used")) {
    return LINK_EXPIRED;
  }
  return LINK_UNUSABLE;
}
