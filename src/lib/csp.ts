/**
 * The page Content-Security-Policy with a per-request nonce for scripts.
 *
 * Shipped as Content-Security-Policy-Report-Only first: the browser reports what it would block, nothing breaks.
 * Switch the header name in src/proxy.ts once the console is clean on a real production page.
 */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Next.js and the design system still use inline style attributes, so styles stay permissive for now.
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * Service-worker scripts are not documents. Their own response headers govern what they can import, and the
 * Firebase worker imports its SDK from gstatic.com, which the page policy deliberately does not allow for scripts.
 * So these two paths are served without the page policy.
 */
const WORKER_SCRIPT_PATHS = new Set(["/sw.js", "/firebase-messaging-sw.js"]);

export function isWorkerScriptPath(path: string): boolean {
  return WORKER_SCRIPT_PATHS.has(path);
}

