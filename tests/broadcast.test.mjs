import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { broadcastToken, broadcastRoom, broadcastConfigured, broadcastService } from "../src/lib/broadcast.ts";
const source = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("broadcast tokens are room-scoped, short-lived, and viewers cannot publish", async () => {
  const old = { key: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_API_SECRET };
  process.env.LIVEKIT_API_KEY = "test-key";
  process.env.LIVEKIT_API_SECRET = "a-test-secret-that-is-long-enough-for-hmac";
  try {
    for (const publish of [false, true]) {
      const jwt = await broadcastToken("test-id", "test-viewer", publish);
      const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
      assert.equal(claims.video.room, broadcastRoom("test-id"));
      assert.equal(claims.video.canPublish, publish);
      assert.equal(claims.video.canPublishData, false);
      assert.equal(claims.video.canSubscribe, true);
      assert.ok(claims.exp - claims.nbf <= 60);
      assert.deepEqual(claims.video.canPublishSources, publish ? ["camera", "microphone"] : []);
      assert.ok(!jwt.includes(process.env.LIVEKIT_API_SECRET));
    }
  } finally {
    for (const [key, value] of [["LIVEKIT_API_KEY", old.key], ["LIVEKIT_API_SECRET", old.secret]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
test("missing provider configuration fails closed", () => {
  const old = process.env.LIVEKIT_URL;
  delete process.env.LIVEKIT_URL;
  try { assert.equal(broadcastConfigured(), false); assert.throws(broadcastService, /not configured/); }
  finally { if (old !== undefined) process.env.LIVEKIT_URL = old; }
});
test("token endpoint checks live status, owner permission and actual provider room", () => {
  const route = source("src/app/api/streams/[id]/token/route.ts");
  for (const guard of ['stream.status !== "live"', 'hasLiveBadge', 'viewer.userId === stream.userId', 'listRooms', 'hasBadOrigin', 'no-store']) assert.ok(route.includes(guard), guard);
});
test("provider lifecycle and moderation disconnect the actual room", () => {
  assert.match(source("src/app/api/streams/webhook/route.ts"), /receiver\.receive\(body/);
  assert.match(source("src/app/api/streams/webhook/route.ts"), /participant_left/);
  assert.match(source("src/app/api/admin/streams/route.ts"), /await stopBroadcast\(id\)/);
  assert.match(source("src/app/api/streams/route.ts"), /pg_advisory_xact_lock/);
  assert.match(source("next.config.ts"), /camera=\(self\), microphone=\(self\)/);
});
test("disconnects clear the selected broadcast and release the viewer controls", () => {
  const studio = source("src/components/broadcast-studio.tsx");
  assert.match(studio, /RoomEvent\.Disconnected,[\s\S]*?setId\(null\)/);
  assert.match(studio, /const checking = activeId\.current/);
  assert.match(studio, /if \(!mounted\.current\) throw/);
});
test("signed stream webhooks are origin exempt but body-limited before signature parsing", () => {
  assert.match(source("src/lib/origin.ts"), /"\/api\/streams\/webhook"/);
  assert.match(source("src/app/api/streams/webhook/route.ts"), /readAvatarBody\(req, 65536\)/);
});
