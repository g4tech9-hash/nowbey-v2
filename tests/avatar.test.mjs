import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AVATAR_MAX_BYTES, readAvatarBody } from "../src/lib/avatar-upload.ts";
const source = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("avatar uploads reject empty and oversized declared bodies", async () => {
  await assert.rejects(readAvatarBody(new Request("https://example.com", { method: "POST" })), /Choose/);
  await assert.rejects(readAvatarBody(new Request("https://example.com", { method: "POST", headers: { "content-length": String(AVATAR_MAX_BYTES + 1) }, body: "x" })), /3 MB/);
});
test("actual upload bytes are bounded without trusting content length", async () => {
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(AVATAR_MAX_BYTES)); c.enqueue(new Uint8Array(1)); c.close(); } });
  await assert.rejects(readAvatarBody(new Request("https://example.com", { method: "POST", body, duplex: "half" })), /3 MB/);
});
test("avatar reader preserves bytes within the limit", async () => {
  const data = await readAvatarBody(new Request("https://example.com", { method: "POST", body: new Uint8Array([1, 2, 3]) }));
  assert.deepEqual([...data], [1, 2, 3]);
});
test("photo writes retain owner, origin, rate-limit and decoder safeguards", () => {
  const route = source("src/app/api/account/avatar/route.ts");
  for (const guard of ["hasBadOrigin(req)", "!viewer.signedIn", "hit(`avatar:", "processPhoto(input)", "viewer.userId"])
    assert.ok(route.includes(guard), guard);
  assert.ok(!route.includes("body.userId"));
});
test("photo reads enforce privacy and never use a shared image cache", () => {
  const route = source("src/app/api/avatars/[handle]/route.ts");
  assert.ok(route.indexOf('settings.visibility === "private"') < route.indexOf("await avatarFor"));
  assert.match(route, /viewer\.userId !== member\.id && !viewer\.isAdmin/);
  assert.match(route, /member\.status === "suspended"/);
  assert.match(route, /private, no-store/);
});
