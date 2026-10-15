import { redirect } from "next/navigation";
import { safeNext } from "@/lib/redirect";
import { getViewer } from "@/lib/viewer";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (viewer.signedIn && viewer.userId && viewer.handle) {
    const sp = await searchParams;
    const verified = first(sp.verified);
    const fallback = verified === "1" || verified === "0" ? `/you/settings?verified=${verified}` : "/you";
    redirect(safeNext(first(sp.next) ?? null, fallback));
  }
  return <LoginForm />;
}
