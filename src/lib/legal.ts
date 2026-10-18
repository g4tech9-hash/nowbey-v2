/**
 * Everything legal that code needs to agree with the pages.
 *
 * One place, because the failure mode is silent: a checkbox that says "you agree" while the database records
 * nothing, or a policy dated last year while the code ships a new tracker. The version below is written onto
 * every new account (users.terms_version); bump it when the wording changes and the record stays honest.
 */

/** Where people reach you about content, privacy and deletion. Set SUPPORT_EMAIL in .env. */
export const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || process.env.ENTERPRISE_NOTIFY_TO || "").trim();

/** The date shown at the top of both documents. Bump it with the wording, never without. */
export const LEGAL_UPDATED = "18 October 2026";

/**
 * The consent version stored on every account created from now on.
 *
 * A date rather than a hash: a lawyer, a support agent and a database all understand "this person agreed to
 * the 18 October 2026 wording". Stored as text so it survives a policy being re-dated.
 */
export const TERMS_VERSION = "2026-10-18";

/** The single sentence beside the consent checkbox, on the website and in the app. */
export const CONSENT_LABEL = "I agree to the Terms and the Privacy Policy";

/** Where the documents live, so no surface hard-codes a path that later moves. */
export const LEGAL_LINKS = { terms: "/terms", privacy: "/privacy", storage: "/cookies" } as const;

/** True when the deployment has somewhere for privacy and deletion requests to land. */
export const supportConfigured = (): boolean => SUPPORT_EMAIL.length > 0;
