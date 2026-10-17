/**
 * The Gemini request body: the NowBey directive is sent as the system instruction on every call,
 * and the caller's parts, JSON flag and limits are passed through unchanged.
 * Hermetic: pure functions.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { NOWBEY_AI_DIRECTIVE, buildGeminiBody } from "../src/lib/ai.ts";

test("every body carries the directive as the system instruction", () => {
  const body = buildGeminiBody([{ text: "hello" }]);
  assert.equal(body.systemInstruction.parts[0].text, NOWBEY_AI_DIRECTIVE);
});

test("the directive keeps the hard rules: no publishing, no sending, no invented facts, JSON-only", () => {
  for (const phrase of [
    "Never publish, hide, block, delete",
    "Never send emails, alerts",
    "Never edit code",
    "Never invent facts",
    "return JSON only",
    "Keep Bahamian place names",
  ]) {
    assert.ok(NOWBEY_AI_DIRECTIVE.includes(phrase), `missing rule: ${phrase}`);
  }
});

test("caller parts are passed through in a single user turn", () => {
  const parts = [{ text: "draft" }, { inlineData: { mimeType: "image/jpeg", data: "abc" } }];
  const body = buildGeminiBody(parts);
  assert.deepEqual(body.contents, [{ role: "user", parts }]);
});

test("JSON mode is set only when asked, and defaults hold", () => {
  const plain = buildGeminiBody([{ text: "x" }]);
  assert.equal(plain.generationConfig.responseMimeType, undefined);
  assert.equal(plain.generationConfig.temperature, 0.3);
  assert.equal(plain.generationConfig.maxOutputTokens, 1024);

  const json = buildGeminiBody([{ text: "x" }], { json: true, temperature: 0.1, maxTokens: 700 });
  assert.equal(json.generationConfig.responseMimeType, "application/json");
  assert.equal(json.generationConfig.temperature, 0.1);
  assert.equal(json.generationConfig.maxOutputTokens, 700);
});
