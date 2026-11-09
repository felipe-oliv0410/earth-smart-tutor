import { it } from "node:test";
import { strict as assert } from "node:assert";
import { normalizeVoiceContext, realtimeSpeed } from "./live-context";

it("keeps the guided tutor choices available for voice", () => {
  for (const mode of ["gestao", "gestao2"]) assert.equal(normalizeVoiceContext({ mode }).mode, mode);
  assert.equal(normalizeVoiceContext({ mode: "ipcc1" }).mode, undefined);
});
it("preserves voice speed preferences", () => {
  assert.equal(normalizeVoiceContext({ speed: 0.5 }).speed, 0.5);
  assert.equal(normalizeVoiceContext({ speed: NaN }).speed, 1);
});
it("keeps voice speed inside OpenAI's accepted range", () => {
  assert.equal(realtimeSpeed(2), 1.5);
  assert.equal(realtimeSpeed(0.8), 0.8);
});
