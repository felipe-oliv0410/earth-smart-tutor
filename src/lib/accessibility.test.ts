import { describe, expect, test } from "bun:test";
import { FONT_OPTIONS, normalizeSettings, speechDuration } from "./accessibility";

describe("accessibility preferences", () => {
  test("offers all seven requested fonts", () => {
    expect(FONT_OPTIONS.map((font) => font.label)).toEqual(["Padrão", "Atkinson Hyperlegible", "Lexend", "OpenDyslexic", "Verdana", "Arial", "Times New Roman", "Courier New"]);
  });
  test("allows increasing and decreasing font size", () => {
    expect(normalizeSettings({ size: 110 }).size).toBe(110);
    expect(normalizeSettings({ size: 90 }).size).toBe(90);
  });
  test("preserves the high contrast selection", () => {
    expect(normalizeSettings({ contrast: true }).contrast).toBe(true);
    expect(normalizeSettings({ contrast: false }).contrast).toBe(false);
  });
  test("schedules faster and slower speech without overlapping audio chunks", () => {
    expect(speechDuration(3, 1.5)).toBe(2);
    expect(speechDuration(3, 0.5)).toBe(6);
  });
  test("bounds corrupted preferences to supported ranges", () => {
    expect(normalizeSettings({ size: 500, speed: 99, font: "invalid" })).toEqual({ size: 200, speed: 2, font: "default", contrast: false });
    expect(normalizeSettings({ size: 0, speed: 0 })).toEqual({ size: 80, speed: 0.5, font: "default", contrast: false });
  });
});