export const FONT_OPTIONS = [
  { value: "default", label: "Padrão", family: "" },
  { value: "atkinson", label: "Atkinson Hyperlegible", family: '"Atkinson Hyperlegible", sans-serif' },
  { value: "lexend", label: "Lexend", family: '"Lexend", sans-serif' },
  { value: "dyslexic", label: "OpenDyslexic", family: '"OpenDyslexic", sans-serif' },
  { value: "verdana", label: "Verdana", family: "Verdana, sans-serif" },
  { value: "arial", label: "Arial", family: "Arial, sans-serif" },
  { value: "times", label: "Times New Roman", family: '"Times New Roman", serif' },
  { value: "courier", label: "Courier New", family: '"Courier New", monospace' },
] as const;

export type AccessibilitySettings = { size: number; font: string; contrast: boolean; speed: number };
export const DEFAULT_SETTINGS: AccessibilitySettings = { size: 100, font: "default", contrast: false, speed: 1 };

export function normalizeSettings(value: Partial<AccessibilitySettings>): AccessibilitySettings {
  return {
    size: typeof value.size === "number" && Number.isFinite(value.size) ? Math.min(200, Math.max(80, value.size)) : 100,
    font: FONT_OPTIONS.some((font) => font.value === value.font) ? value.font ?? "default" : "default",
    contrast: value.contrast === true,
    speed: typeof value.speed === "number" && Number.isFinite(value.speed) ? Math.min(2, Math.max(0.5, value.speed)) : 1,
  };
}

export function speechDuration(duration: number, speed: number) {
  return duration / normalizeSettings({ speed }).speed;
}