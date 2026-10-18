export type VoiceContext = { mode?: string; speed: number; history: { role: "user" | "assistant"; text: string }[] };
export function normalizeVoiceContext(value: unknown): VoiceContext {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const mode = typeof data["mode"] === "string" && ["sensibilizacao", "escola", "cops", "ndcs"].includes(data["mode"]) ? data["mode"] : undefined;
  const speed = typeof data["speed"] === "number" && Number.isFinite(data["speed"]) ? Math.min(2, Math.max(0.5, data["speed"])) : 1;
  const history: VoiceContext["history"] = [];
  if (Array.isArray(data["history"])) for (const item of data["history"].slice(-6)) {
    if (item && (item.role === "user" || item.role === "assistant") && typeof item.text === "string" && item.text.trim()) history.push({ role: item.role, text: item.text.slice(0, 800) });
  }
  return { ...(mode ? { mode } : {}), speed, history };
}
export function voiceSeconds(seconds: number) { return Math.max(15, seconds); }
