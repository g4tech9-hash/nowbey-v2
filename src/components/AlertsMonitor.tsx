'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side monitor that polls /api/alerts so newly issued or relayed Marco's
 * Alerts surface without a manual reload on /alerts, /feed and /.
 */
export function AlertsMonitor({ intervalMs = 60_000 }: { intervalMs?: number } = {}) {
  const router = useRouter();
  const signature = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch('/api/alerts?limit=10', {
          cache: 'no-store',
          headers: { accept: 'application/json' },
        });
        if (res.ok) {
          const json = await res.json();
          const items: Array<{ id: string }> = json.items || [];
          const nextSig = items.map((i) => i.id).join(',');

          if (signature.current === null) {
            signature.current = nextSig;
          } else if (nextSig !== signature.current) {
            signature.current = nextSig;
            router.refresh();
          }
        }
      } catch {
        // Fail soft — keep displaying the last rendered alerts.
      }
      if (!cancelled) {
        timer = setTimeout(poll, intervalMs);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs, router]);

  return null;
}
