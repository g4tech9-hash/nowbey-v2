import { NextResponse } from "next/server";

export * from "./ratelimit-core";

export function tooMany(retryAfter: number, what = "requests") {
  const wait = retryAfter >= 90 ? `${Math.ceil(retryAfter / 60)} minutes` : `${retryAfter} seconds`;
  return NextResponse.json(
    { error: `Too many ${what} just now. Please wait ${wait} and try again.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
