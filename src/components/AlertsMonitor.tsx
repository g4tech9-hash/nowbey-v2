'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side monitor that polls /api/alerts so newly issued alerts surface
 * without a manual reload.
 *
 * It keeps the latest alert id in ref; when a newer top alert appears it calls
 * `router.refresh()` so the server component re-validates and the new alert
 * appears on the page.
 *
 * @param intervalMs poll interval, default 60s
 */
export function AlertsMonitor({ intervalMs = 60_000 }: { intervalMs?: number } = {}) {
  const router = useRouter();
  const latestId = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = async () => {
    try {
      const res = await fetch('/api/alerts?limit=5', {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = json.items || [];
      const nextLatest = items[0]?.id || null;

      if (latestId.current === null) {
        latestId.current = nextLatest;
      } else if (nextLatest && nextLatest !== latestId.current) {
        latestId.current = nextLatest;
        // A newer alert has been issued — refresh the page so it appears.
        router.refresh();
      }
    } catch {
      // Fail soft — the page keeps showing its last-fetched alerts.
    }

    timer.current = setTimeout(poll, intervalMs);
  };

  useEffect(() => {
    poll();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [intervalMs, router]);

  return null;
}
