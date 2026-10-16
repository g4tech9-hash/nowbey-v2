import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getViewer } from "@/lib/viewer";
import { adminAccess } from "@/lib/handles";
import { PageHead } from "@/components/app-shell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin access" };

/**
 * "Why can I not open /admin?" — answered for the signed-in account, and for nobody else.
 *
 * This page is deliberately not behind the admin gate. The moment you need it is exactly the moment
 * the gate says no, and a diagnostic you cannot reach is not a diagnostic. It reads only the
 * viewer's own row, so it leaks nothing about anybody else's account.
 */
export default async function AdminAccessPage() {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) redirect("/login?mode=signin&next=/admin-access");

  // Read the row fresh: the viewer object already carries role and emailVerified, but this keeps the
  // report honest about what is in the database right now rather than what a cached layout saw.
  const [u] = await db.select().from(users).where(eq(users.id, viewer.userId)).limit(1);
  if (!u) redirect("/login?mode=signin&next=/admin-access");

  const access = adminAccess(u);
  const row = (k: string, v: React.ReactNode, warn = false) => (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 py-2 last:border-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-[#6e97a0]">{k}</dt>
      <dd className={`text-right text-[13px] ${warn ? "font-bold text-sun-400" : "text-sand-100"}`}>{v}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-[680px] py-6">
      <PageHead
        eyebrow="Account"
        title="Admin access"
        blurb="Why /admin opens for an account, or why it does not. Read-only — nothing here changes anything."
        actions={
          <Link
            href="/you"
            className="rounded-full border border-white/15 px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/8"
          >
            Your account
          </Link>
        }
      />

      <section className={`rounded-2xl p-4 ${access.isAdmin ? "bg-tide-500/12" : "bg-sun-500/12"}`}>
        <p className="display text-[17px] font-extrabold text-sand-100">
          {access.isAdmin ? "You have admin access." : "You do not have admin access."}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-sand-100/90">{access.reason}</p>
        {access.isAdmin ? (
          <Link
            href="/admin"
            className="mt-3 inline-block rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950 hover:bg-tide-400"
          >
            Open the admin area
          </Link>
        ) : null}
      </section>

      <section className="glass mt-4 rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-sand-100">The two doors</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">
          An account is an admin in one of two ways, and only one of them has to be true.
        </p>
        <dl className="mt-3">
          {row(
            "1. Role on the account",
            u.role === "admin" ? (
              <span className="font-bold text-tide-300">admin</span>
            ) : (
              <>
                <span className="font-mono">{u.role}</span> — set by an admin on the Members page, or by{" "}
                <code className="rounded bg-white/10 px-1">setup_admins.sql</code>
              </>
            ),
          )}
          {row(
            "2. ADMIN_HANDLES + confirmed email",
            access.inAdminHandles ? (
              access.emailVerified ? (
                <span className="font-bold text-tide-300">listed, email confirmed</span>
              ) : (
                <span className="font-bold text-sun-400">listed, email not confirmed</span>
              )
            ) : (
              <>not listed in ADMIN_HANDLES{access.adminHandlesSet ? "" : " — ADMIN_HANDLES is empty"}</>
            ),
            access.inAdminHandles && !access.emailVerified,
          )}
        </dl>
      </section>

      <section className="glass mt-4 rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-sand-100">What this deployment sees</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">
          Read from the server environment of the deployment that served this page. If a value looks wrong, it is
          set in the host&apos;s environment variables and needs a redeploy to take effect.
        </p>
        <dl className="mt-3">
          {row("Signed in as", <span className="font-mono">@{u.handle}</span>)}
          {row(
            "Email on the account",
            u.email ? (
              <>
                <span className="break-all font-mono">{u.email}</span>
                <span className="mt-1 block">{u.emailVerifiedAt ? "confirmed" : "not confirmed"}</span>
              </>
            ) : (
              <span className="text-sun-400">none on file</span>
            ),
            !u.emailVerifiedAt,
          )}
          {row("ADMIN_HANDLES", access.adminHandlesSet ? "set" : "not set", !access.adminHandlesSet)}
          {row("ADMIN_EMAILS", access.adminEmailsSet ? "set" : "not set", !access.adminEmailsSet)}
          {row(
            "May register this handle",
            access.mayClaim ? "yes — this address is allowed" : "no — ADMIN_EMAILS does not cover it",
            !access.mayClaim,
          )}
        </dl>
      </section>

      {!access.isAdmin && !access.inAdminHandles ? (
        <section className="glass mt-4 rounded-2xl p-4">
          <p className="display text-[15px] font-bold text-sand-100">If the handle is simply not listed</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-300">
            Add <code className="rounded bg-white/10 px-1">ADMIN_HANDLES={u.handle}</code> to the environment of
            this deployment and redeploy. Until then the account is an ordinary member. If you cannot reach the
            environment at all, an existing admin can promote it from the Members page, or{" "}
            <code className="rounded bg-white/10 px-1">src/db/setup_admins.sql</code> sets the role directly in the
            database.
          </p>
        </section>
      ) : null}

      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-400">
        Nothing here changes anything — it only reports. Signing out and back in is never the fix: the role is read
        from the database on every request, and ADMIN_HANDLES is read from the environment on every request.
      </p>
    </div>
  );
}
