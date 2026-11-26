"use client";

/** The name and the mail host stay apart until someone chooses Contact us. */
const CONTACT_USER = "BolyardGarage";
const CONTACT_DOMAIN = "gmail.com";
const CONTACT_SUBJECT = "Noble Bereans";

export function buildContactMailto(): string {
  const at = String.fromCharCode(64);
  const address = CONTACT_USER.concat(at, CONTACT_DOMAIN);
  return "mailto:".concat(address, "?subject=", encodeURIComponent(CONTACT_SUBJECT));
}

export function ContactUs() {
  return (
    <button
      type="button"
      data-testid="contact-us"
      className="inline-flex items-center justify-start bg-transparent p-0 text-left text-lg text-grove-deep underline"
      onClick={() => {
        window.location.assign(buildContactMailto());
      }}
    >
      Contact us
    </button>
  );
}
