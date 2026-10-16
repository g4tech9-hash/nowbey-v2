/**
 * "Sign in with Google" — OAuth 2.0 Authorization Code flow with PKCE, written on top of node:crypto
 * instead of an auth framework, because NowBey already has its own session (signed cookie for the
 * website, bearer token for the app) and only needs one thing from Google: a *verified* email address.
 *
 * What we never do: store a Google password (there isn't one to store), ask for anything beyond
 * `openid email profile`, or keep a Google access token after the handshake.
 *
 * The whole feature is off until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set, exactly like the
 * push and AI integrations, so the site behaves the same as before until credentials exist.
 */
import { createHash, randomBytes } from "node:crypto";

/** Where the browser keeps the OAuth state + PKCE verifier while it is away at Google. */
export const OAUTH_COOKIE = "nowbey_oauth";

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

/** Google's endpoints. GOOGLE_OAUTH_BASE exists so the test suite can point the token call at a local server. */
const ACCOUNTS = "https://accounts.google.com";
function oauthBase(): string {
  return (process.env.GOOGLE_OAUTH_BASE?.trim() || "https://oauth2.googleapis.com").replace(/\/+$/, "");
}

export function googleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
}

function clientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
}

export function googleConfigured(): boolean {
  return Boolean(googleClientId() && clientSecret());
}

/** The address Google sends the browser back to. Must be registered, character for character, in the Google Cloud console. */
export function googleRedirectUri(base: string): string {
  return `${base.replace(/\/+$/, "")}/api/auth/google/callback`;
}

/** PKCE: prove that whoever finishes the handshake is the same browser that started it. */
export function makePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function googleAuthUrl(opts: { redirectUri: string; state: string; challenge: string; loginHint?: string | null }): string {
  const url = new URL(`${ACCOUNTS}/o/oauth2/v2/auth`);
  url.searchParams.set("client_id", googleClientId());
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  // Always show the account chooser: people share phones in a household, and silently reusing the
  // last Google account is how someone signs into a stranger's NowBey by accident.
  url.searchParams.set("prompt", "select_account");
  if (opts.loginHint) url.searchParams.set("login_hint", opts.loginHint);
  return url.toString();
}

export type IdTokenClaims = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
  aud?: unknown;
  iss?: unknown;
  exp?: unknown;
};

/**
 * Reads the ID token that came back from Google's token endpoint.
 *
 * No signature check, on purpose and per Google's own guidance: this token was handed to *us* over
 * TLS by the token endpoint itself (not passed through the browser), so the transport is the proof.
 * The claims that matter are still checked: the audience must be our client, the issuer must be
 * Google, it must not be expired, and the address must be one Google has verified.
 */
export function readIdToken(idToken: string, opts: { now?: number } = {}): GoogleProfile | null {
  const now = opts.now ?? Date.now();
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  let claims: IdTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as IdTokenClaims;
  } catch {
    return null;
  }
  const aud = String(claims.aud ?? "");
  const iss = String(claims.iss ?? "");
  const exp = Number(claims.exp ?? 0);
  if (aud !== googleClientId()) return null;
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") return null;
  if (!Number.isFinite(exp) || exp * 1000 < now - 60_000) return null;

  const email = String(claims.email ?? "").trim().toLowerCase();
  const sub = String(claims.sub ?? "").trim();
  if (!sub || !email.includes("@")) return null;
  // An unverified Google address proves nothing about who owns it, so it can never open an account.
  const emailVerified = claims.email_verified === true || claims.email_verified === "true";
  const name = typeof claims.name === "string" ? claims.name.slice(0, 80) : null;
  const picture = typeof claims.picture === "string" ? claims.picture : null;
  return { sub, email, emailVerified, name, picture };
}

/**
 * True when Postgres says a column we expect does not exist (`42703`), which for this feature means one
 * thing: the operator has not run `src/db/add-google-auth.sql` yet. Recognising it turns a 500 on the
 * live site into a sentence a member can act on. Drizzle wraps driver errors, so the cause is checked too.
 */
export function isMissingColumn(e: unknown): boolean {
  const err = e as { code?: unknown; cause?: { code?: unknown } } | null;
  return err?.code === "42703" || err?.cause?.code === "42703";
}

export type TokenResponse = { id_token?: unknown; access_token?: unknown; error?: unknown; error_description?: unknown };

/** Swaps the one-time code (plus the PKCE verifier) for an ID token. */
export async function exchangeCode(opts: {
  code: string;
  verifier: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}): Promise<{ idToken: string } | { error: string }> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: googleClientId(),
    client_secret: clientSecret(),
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
    code_verifier: opts.verifier,
  });
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`${oauthBase()}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json().catch(() => ({}))) as TokenResponse;
    if (!res.ok || typeof data.id_token !== "string") {
      return { error: String(data.error_description ?? data.error ?? `Google answered ${res.status}`).slice(0, 200) };
    }
    return { idToken: data.id_token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "could not reach Google" };
  }
}

/**
 * A handle nobody else has, derived from the Google address. Local parts are full of dots and plus
 * tags that handles do not allow, so the shape is normalised first.
 *
 * `taken` must contain every handle already used *and* every handle in ADMIN_HANDLES: a handle from
 * that list carries admin rights, so it must never be handed out as a side effect of a Google sign-up.
 */
export function handleFromEmail(email: string, taken: Iterable<string>): string {
  const takenSet = new Set([...taken].map((t) => t.toLowerCase()));
  const local = email.split("@")[0] ?? "";
  let base = local
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 14);
  if (base.length < 3) base = "member";
  if (takenSet.has(base)) {
    // Two people called "jenny" is normal. Add the smallest suffix that is free, then a random one.
    let n = 2;
    while (n < 100 && takenSet.has(`${base}${n}`)) n += 1;
    base = n < 100 ? `${base}${n}` : `${base.slice(0, 10)}_${randomBytes(2).toString("hex")}`;
  }
  return base.slice(0, 18);
}
