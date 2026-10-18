"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePillIndicator } from "@/lib/pulse/motion";

export type AdminTab = { href: string; label: string; badge?: number };

/**
 * The admin section nav — the same travelling pill the public feed uses, so the
 * desk and the app do not look like two products.
 *
 * The indicator is measured, not duplicated per tab: one absolutely-positioned
 * element animates its `transform` and `width` to whichever pill the route
 * matches, which is what makes switching between twelve moderation queues feel
 * like one surface moving rather than fourteen backgrounds flashing. A badge is
 * a count, so it is mono and tabular.
 */
export function AdminNav({ tabs }: { tabs: AdminTab[] }) {
  const pathname = usePathname();
  const activeKey = tabs.find((t) => (t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href)))?.href ?? "";
  const { rowRef, style, ready } = usePillIndicator<HTMLDivElement>(activeKey);

  return (
    <nav
      aria-label="Admin sections"
      className="pulse-pill-row pulse-no-scrollbar mb-5 border-b border-default pb-2"
      tabIndex={0}
    >
      <span className="pulse-pill-indicator" data-ready={ready ? "true" : undefined} style={style} aria-hidden />
      {tabs.map((t) => {
        const active = t.href === activeKey;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            data-on={active ? "true" : undefined}
            className="pulse-chip pulse-chip-nav shrink-0"
          >
            {t.label}
            {t.badge ? (
              <span className="pulse-chip-count" aria-label={`${t.badge} needing attention`}>
                {t.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
