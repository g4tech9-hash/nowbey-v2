import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Pool } from 'pg';

export interface StoredBulletin {
  id: string;
  alertType: 'marco' | 'missing';
  status: 'active' | 'resolved' | 'cancelled';
  verified: boolean;
  title: string;
  body: string;
  publishedAt: string;
  publisher: string;
  url: string | null;
  photo: string | null;
}

const LOCAL_STORE_PATH = join(process.cwd(), 'wire', 'data', 'submitted-alerts.json');

const globalState = globalThis as typeof globalThis & {
  __nowbeyAlertsPool?: Pool;
  __nowbeyAlertsBootstrapped?: boolean;
  __nowbeyMemoryAlerts?: Map<string, StoredBulletin>;
};

function memoryMap(): Map<string, StoredBulletin> {
  if (!globalState.__nowbeyMemoryAlerts) {
    globalState.__nowbeyMemoryAlerts = new Map<string, StoredBulletin>();
  }
  return globalState.__nowbeyMemoryAlerts;
}

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!globalState.__nowbeyAlertsPool) {
    const pool = new Pool({
      connectionString: url,
      max: 4,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 6_000,
    });
    pool.on('error', (err) => {
      console.warn('[alerts-store] idle pg client error:', err.message);
    });
    globalState.__nowbeyAlertsPool = pool;
  }
  return globalState.__nowbeyAlertsPool;
}

async function ensureTable(pool: Pool): Promise<void> {
  if (globalState.__nowbeyAlertsBootstrapped) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nowbey_submitted_alerts (
      id TEXT PRIMARY KEY,
      alert_type TEXT NOT NULL DEFAULT 'marco',
      status TEXT NOT NULL DEFAULT 'active',
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      publisher TEXT NOT NULL DEFAULT 'Marco''s Alert',
      url TEXT,
      photo TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  globalState.__nowbeyAlertsBootstrapped = true;
}

async function readLocalFile(): Promise<StoredBulletin[]> {
  try {
    const raw = await readFile(LOCAL_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalFile(items: StoredBulletin[]): Promise<void> {
  try {
    await mkdir(dirname(LOCAL_STORE_PATH), { recursive: true });
    await writeFile(LOCAL_STORE_PATH, JSON.stringify(items, null, 2), 'utf8');
  } catch {
    // Read-only serverless filesystems (when DATABASE_URL is temporarily unreachable)
    // still retain items in process memory.
  }
}

/**
 * List active Cell Broadcast / community-relayed alerts stored at runtime.
 * Uses Postgres when DATABASE_URL is configured (Vercel preview/production),
 * and falls back gracefully to local JSON + memory in offline development.
 */
export async function listSubmittedAlerts(): Promise<StoredBulletin[]> {
  const merged = new Map<string, StoredBulletin>();

  for (const item of memoryMap().values()) {
    merged.set(item.id, item);
  }

  for (const item of await readLocalFile()) {
    if (item && item.id) merged.set(item.id, item);
  }

  const pool = getPool();
  if (pool) {
    try {
      await ensureTable(pool);
      const { rows } = await pool.query<{
        id: string;
        alert_type: string;
        status: string;
        verified: boolean;
        title: string;
        body: string;
        published_at: Date | string;
        publisher: string;
        url: string | null;
        photo: string | null;
      }>(`
        SELECT id, alert_type, status, verified, title, body, published_at, publisher, url, photo
        FROM nowbey_submitted_alerts
        WHERE status = 'active'
          AND published_at > NOW() - INTERVAL '30 days'
        ORDER BY published_at DESC
        LIMIT 50;
      `);
      for (const row of rows) {
        merged.set(row.id, {
          id: row.id,
          alertType: row.alert_type === 'marco' ? 'marco' : 'missing',
          status: (row.status as StoredBulletin['status']) || 'active',
          verified: Boolean(row.verified),
          title: row.title,
          body: row.body,
          publishedAt:
            row.published_at instanceof Date
              ? row.published_at.toISOString()
              : new Date(row.published_at).toISOString(),
          publisher: row.publisher,
          url: row.url,
          photo: row.photo,
        });
      }
    } catch (err) {
      console.warn(
        '[alerts-store] Postgres read skipped, using local/memory store:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return [...merged.values()].filter((item) => item.status === 'active');
}

/** Save a validated Cell Broadcast / missing-person bulletin across available stores. */
export async function saveSubmittedAlert(bulletin: StoredBulletin): Promise<void> {
  memoryMap().set(bulletin.id, bulletin);

  const existingLocal = await readLocalFile();
  const byId = new Map(existingLocal.map((item) => [item.id, item]));
  byId.set(bulletin.id, bulletin);
  await writeLocalFile([...byId.values()]);

  const pool = getPool();
  if (pool) {
    try {
      await ensureTable(pool);
      await pool.query(
        `
        INSERT INTO nowbey_submitted_alerts (
          id, alert_type, status, verified, title, body, published_at, publisher, url, photo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          alert_type = EXCLUDED.alert_type,
          status = EXCLUDED.status,
          verified = EXCLUDED.verified OR nowbey_submitted_alerts.verified,
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          published_at = EXCLUDED.published_at,
          publisher = EXCLUDED.publisher,
          url = COALESCE(EXCLUDED.url, nowbey_submitted_alerts.url),
          photo = COALESCE(EXCLUDED.photo, nowbey_submitted_alerts.photo);
        `,
        [
          bulletin.id,
          bulletin.alertType,
          bulletin.status,
          bulletin.verified,
          bulletin.title,
          bulletin.body,
          bulletin.publishedAt,
          bulletin.publisher,
          bulletin.url,
          bulletin.photo,
        ],
      );
    } catch (err) {
      console.warn(
        '[alerts-store] Postgres write skipped, retained in local/memory store:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
