import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Any /api address that does not exist answers in JSON, like the real ones, instead of with a web page. */
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as HEAD };
