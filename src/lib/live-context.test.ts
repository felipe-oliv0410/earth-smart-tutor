import { it } from "node:test";
import { strict as assert } from "node:assert";
import { normalizeVoiceContext, voiceSeconds } from "./live-context";

it("keeps the four guided tutor choices available for voice", () => {
  for (const mode of ["sensibilizacao", "escola", "cops", "ndcs"]) assert.equal(normalizeVoiceContext({ mode }).mode, mode);
  assert.equal(normalizeVoiceContext({ mode: "unknown" }).mode, undefined);
});
it("preserves natural voice speed preferences", () => {
  assert.equal(normalizeVoiceContext({ speed: 0.5 }).speed, 0.5);
  assert.equal(normalizeVoiceContext({ speed: 2 }).speed, 2);
  assert.equal(normalizeVoiceContext({ speed: NaN }).speed, 1);
});
it("accounts for the initialization minimum without double charging", () => {
  assert.equal(voiceSeconds(10), 15);
  assert.equal(voiceSeconds(90), 90);
});