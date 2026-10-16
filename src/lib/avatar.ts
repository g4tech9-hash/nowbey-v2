import { sql } from "drizzle-orm";
import { db } from "@/db";

export function missingAvatarTable(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

export async function avatarFor(userId: string): Promise<Buffer | null> {
  try {
    const result = await db.execute(sql`select data from member_avatars where user_id = ${userId}::uuid`);
    return (result.rows[0] as { data: Buffer } | undefined)?.data ?? null;
  } catch (error) {
    if (missingAvatarTable(error)) return null;
    throw error;
  }
}
