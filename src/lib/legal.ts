/** Where people can reach you about content, privacy and deletion. Set SUPPORT_EMAIL in .env. */
export const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || process.env.ENTERPRISE_NOTIFY_TO || "").trim();

/**
 * The address the legal pages quote. Falls back to the public contact address so the
 * documents always name somebody a user can actually write to.
 */
export const LEGAL_EMAIL = (process.env.LEGAL_CONTACT_EMAIL || SUPPORT_EMAIL || "g4tech9@gmail.com").trim();

/**
 * The company details a Bahamian lawyer fills in before the app ships. Until the
 * environment sets them, the pages show the placeholder in plain sight — a blank is
 * obvious, a missing line is not.
 */
export const REGISTERED_COMPANY_NAME = (process.env.REGISTERED_COMPANY_NAME || "[REGISTERED COMPANY NAME]").trim();
export const REGISTERED_ADDRESS = (process.env.REGISTERED_ADDRESS || "[PHYSICAL ADDRESS IN THE BAHAMAS]").trim();

export const LEGAL_UPDATED = "18 October 2026";
