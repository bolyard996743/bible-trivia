export const PASSWORD_RULE = "Use a password of at least 8 characters.";
export const USERNAME_TAKEN = "That username is already taken.";
export const EMAIL_REGISTERED = "That email is already registered. Sign in instead.";
export const SERVER_ERROR = "Something went wrong on our end, please try again.";
export const CONFIRM_EMAIL_MESSAGE = "Check your email to confirm your account, then come back and sign in.";

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

/** Sign-up failures get a specific message. They never ask the player to recheck a generic login. */
export function signupErrorMessage(error: unknown): string {
  const message = errorText(error).toLowerCase();
  const code = errorCode(error);
  const status = errorStatus(error);

  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists") ||
    message.includes("email address is already")
  ) {
    return EMAIL_REGISTERED;
  }

  if (
    code === "weak_password" ||
    message.includes("weak password") ||
    message.includes("password should be at least") ||
    message.includes("password is too short") ||
    /at least \d+ character/.test(message)
  ) {
    return PASSWORD_RULE;
  }

  if (
    (message.includes("username") && /taken|unique|duplicate|already/.test(message)) ||
    (message.includes("duplicate key") && message.includes("username"))
  ) {
    return USERNAME_TAKEN;
  }

  if (status === 429 || (status != null && status >= 500) || /rate limit|too many requests|over_request_rate_limit/.test(message)) {
    return SERVER_ERROR;
  }

  return SERVER_ERROR;
}
