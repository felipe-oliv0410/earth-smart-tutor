import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { FONT_OPTIONS, normalizeSettings, speechDuration } from "./accessibility";

describe("accessibility preferences", () => {
  test("offers all seven requested fonts", () => {
    assert.deepEqual(FONT_OPTIONS.map((font) => font.label), ["Padrão", "Atkinson Hyperlegible", "Lexend", "OpenDyslexic", "Verdana", "Arial", "Times New Roman", "Courier New"]);
  });
  test("allows increasing and decreasing font size", () => {
    assert.equal(normalizeSettings({ size: 110 }).size, 110);
    assert.equal(normalizeSettings({ size: 90 }).size, 90);
  });
  test("preserves the high contrast selection", () => {
    assert.equal(normalizeSettings({ contrast: true }).theme, "contraste");
    assert.equal(normalizeSettings({ theme: "claro" }).theme, "claro");
    assert.equal(normalizeSettings({ theme: "escuro" }).theme, "escuro");
  });
  test("schedules faster and slower speech without overlapping audio chunks", () => {
    assert.equal(speechDuration(3, 1.5), 2);
    assert.equal(speechDuration(3, 0.5), 6);
  });
  test("bounds corrupted preferences to supported ranges", () => {
    assert.deepEqual(normalizeSettings({ size: 500, speed: 99, font: "invalid" }), { size: 200, speed: 2, font: "default", theme: "claro" });
    assert.deepEqual(normalizeSettings({ size: 0, speed: 0 }), { size: 80, speed: 0.5, font: "default", theme: "claro" });
  });
});