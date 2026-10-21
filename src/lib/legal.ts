/** Where people can reach you about content, privacy and deletion. Set SUPPORT_EMAIL in .env. */
export const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || process.env.ENTERPRISE_NOTIFY_TO || "oasistechnology242@gmail.com").trim();

/** The legal person behind NowBey — named in the Terms, the Privacy Policy and the footer. */
export const LEGAL_ENTITY = (process.env.LEGAL_ENTITY || "Oasis Technology").trim();

export const LEGAL_UPDATED = "21 October 2026";

/** Short brand line for footers and the app's About area. ™ not ®: filings are pending. */
export const TRADEMARK_NOTICE = `NowBey™ is a trademark of ${LEGAL_ENTITY}.`;

export const COPYRIGHT_NOTICE = `© ${new Date().getFullYear()} ${LEGAL_ENTITY}. All rights reserved.`;
