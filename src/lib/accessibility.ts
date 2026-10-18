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

export type AccessibilitySettings = { size: number; font: string; theme: Theme; speed: number };
export const THEMES = [{ value: "claro", label: "Modo claro" }, { value: "escuro", label: "Modo escuro" }, { value: "contraste", label: "Alto contraste" }] as const;
export type Theme = (typeof THEMES)[number]["value"];
export const DEFAULT_SETTINGS: AccessibilitySettings = { size: 100, font: "default", theme: "claro", speed: 1 };

export function normalizeSettings(value: Partial<AccessibilitySettings> & { contrast?: boolean }): AccessibilitySettings {
  return {
    size: typeof value.size === "number" && Number.isFinite(value.size) ? Math.min(200, Math.max(80, value.size)) : 100,
    font: FONT_OPTIONS.some((font) => font.value === value.font) ? value.font ?? "default" : "default",
    // "contrast" é a preferência antiga (antes dos temas).
    theme: THEMES.find((t) => t.value === value.theme)?.value ?? (value.contrast === true ? "contraste" : "claro"),
    speed: typeof value.speed === "number" && Number.isFinite(value.speed) ? Math.min(2, Math.max(0.5, value.speed)) : 1,
  };
}

export function speechDuration(duration: number, speed: number) {
  return duration / normalizeSettings({ speed }).speed;
}