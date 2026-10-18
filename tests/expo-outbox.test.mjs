/**
 * The app had no way to keep a report written without signal.
 *
 * The web lost a draft once (audit R1: sessionStorage, no expiry, a `restored` flag nothing rendered). The
 * phone is worse placed and more likely to be used in a squall, so the queue is tested as arithmetic before
 * any of it touches React Native.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACKOFF_MS,
  MAX_ATTEMPTS,
  MAX_ITEMS,
  backoffMs,
  dueItem,
  enqueue,
  hasFailed,
  makeClientKey,
  markFailed,
  markSending,
  markSent,
  markTerminal,
  prune,
  queueMessage,
  retryNow,
  waitingCount,
} from "../expo/src/outbox-core.ts";
import { fromChunks, toChunks } from "../expo/src/chunk.ts";

const payload = {
  title: "Water at the dip",
  category: "flood",
  severity: 3,
  lat: 25.08,
  lng: -77.34,
  anonymous: true,
};

const t0 = 1_700_000_000_000;

test("a queued report is due immediately and keeps its anonymity", () => {
  const items = enqueue([], payload, t0, "k1");
  assert.equal(items.length, 1);
  assert.equal(items[0].anonymous, true, "an anonymous report must stay anonymous in the queue");
  assert.equal(dueItem(items, t0)?.clientKey, "k1");
});

test("the same clientKey cannot be queued twice", () => {
  const once = enqueue([], payload, t0, "k1");
  const twice = enqueue(once, payload, t0 + 10, "k1");
  assert.equal(twice.length, 1, "a double tap must not make two items");
});

test("the queue is bounded, oldest dropped first", () => {
  let items = [];
  for (let i = 0; i < MAX_ITEMS + 5; i += 1) items = enqueue(items, payload, t0 + i, `k${i}`);
  assert.equal(items.length, MAX_ITEMS);
  assert.equal(items[0].clientKey, "k5", "the five oldest are the ones dropped");
});

test("an in-flight item is never picked up twice", () => {
  let items = enqueue([], payload, t0, "k1");
  items = markSending(items, "k1");
  assert.equal(dueItem(items, t0), null, "a sending item must not be attempted again");
});

test("backoff grows, is bounded, and never retries instantly after a failure", () => {
  let items = enqueue([], payload, t0, "k1");
  items = markFailed(items, "k1", t0, "offline");
  assert.equal(items[0].state, "queued");
  assert.equal(items[0].nextAt, t0 + BACKOFF_MS[1]);
  assert.equal(dueItem(items, t0 + 1), null, "the retry waits");
  assert.equal(dueItem(items, items[0].nextAt)?.clientKey, "k1");

  assert.equal(backoffMs(0), 0);
  assert.equal(backoffMs(2), 8_000);
  assert.equal(backoffMs(99), BACKOFF_MS[BACKOFF_MS.length - 1], "the last wait is the longest wait");
});

test("after the last attempt it stops trying but keeps the words", () => {
  let items = enqueue([], payload, t0, "k1");
  for (let i = 0; i < MAX_ATTEMPTS; i += 1) items = markFailed(items, "k1", t0 + i, "offline");
  assert.equal(items[0].state, "failed");
  assert.equal(items[0].attempts, MAX_ATTEMPTS);
  assert.equal(dueItem(items, t0 + 10 * 60_000), null, "a failed item must not keep spending the radio");
  assert.equal(items[0].payload.title, "Water at the dip", "the words survive the failure");
});

test("a server refusal is terminal, not an infinite retry", () => {
  let items = enqueue([], payload, t0, "k1");
  items = markTerminal(items, "k1", "Give it a headline of at least 5 characters.");
  assert.equal(items[0].state, "failed");
  assert.equal(dueItem(items, t0 + 1), null);
});

test("Send now clears a backoff, including on an exhausted item", () => {
  let items = enqueue([], payload, t0, "k1");
  for (let i = 0; i < MAX_ATTEMPTS; i += 1) items = markFailed(items, "k1", t0, "offline");
  assert.equal(dueItem(items, t0), null);
  items = retryNow(items, t0);
  assert.equal(items[0].state, "queued");
  assert.equal(items[0].attempts, 0);
  assert.equal(dueItem(items, t0)?.clientKey, "k1");
});

test("a sent item leaves the queue", () => {
  let items = enqueue([], payload, t0, "k1");
  items = markSent(items, "k1");
  assert.equal(items.length, 0);
});

test("yesterday's report is not sent today", () => {
  const items = enqueue([], payload, t0, "k1");
  assert.equal(prune(items, t0 + 60_000).length, 1);
  assert.equal(prune(items, t0 + 25 * 60 * 60_000).length, 0);
});

test("the banner says what happened to the words, not 'failed'", () => {
  assert.equal(queueMessage([]), null);
  const one = enqueue([], payload, t0, "k1");
  assert.match(queueMessage(one), /waiting for a signal/);
  const failed = markTerminal(one, "k1", "nope");
  assert.match(queueMessage(failed), /still on this phone/);
  assert.equal(waitingCount(failed), 1);
  assert.equal(hasFailed(failed), true);
});

test("client keys are unique enough for one phone", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i += 1) seen.add(makeClientKey(t0 + i, Math.random()));
  assert.equal(seen.size, 500);
});

test("a long draft survives being split for secure storage", () => {
  const text = JSON.stringify({ details: "🌊".repeat(2000) + "x".repeat(5000) });
  const parts = toChunks(text);
  assert.ok(parts.length > 1, "the sample is larger than one SecureStore entry");
  assert.ok(parts.every((p) => p.length <= 1400));
  assert.equal(fromChunks(parts), text, "chunking must be lossless, including emoji");
});

test("chunking never splits a surrogate pair", () => {
  const emoji = "🌊".repeat(3000); // 2 UTF-16 units each
  for (const part of toChunks(emoji, 1001)) {
    const last = part.charCodeAt(part.length - 1);
    assert.ok(!(last >= 0xd800 && last <= 0xdbff), "a chunk must not end on a high surrogate");
  }
  assert.equal(fromChunks(toChunks(emoji, 1001)), emoji);
});
