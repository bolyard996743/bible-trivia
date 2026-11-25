import Link from "next/link";

/** Shown beside the forms that create an account. */
export function AuthLegalNotice() {
  return (
    <div className="grid gap-2" data-testid="auth-legal">
      <p className="text-base text-ink-soft">Please read these before you create an account.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/privacy" className="tap inline-flex items-center text-lg text-grove-deep underline">
          Privacy
        </Link>
        <Link href="/terms" className="tap inline-flex items-center text-lg text-grove-deep underline">
          Terms
        </Link>
      </div>
    </div>
  );
}
