import { useEffect, useState } from "react";
import { Contrast, RotateCcw, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { IconeAcessibilidade } from "@/components/icons/acessibilidade";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_SETTINGS, FONT_OPTIONS, THEMES, type Theme, normalizeSettings, type AccessibilitySettings } from "@/lib/accessibility";

export function useAccessibility() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("climatutor-accessibility");
      setSettings(normalizeSettings(saved ? JSON.parse(saved) ?? {} : { contrast: localStorage.getItem("alto-contraste") === "1" }));
    } catch { /* Use defaults when browser storage is unavailable. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const family = FONT_OPTIONS.find((font) => font.value === settings.font)?.family;
    root.style.fontSize = `${settings.size}%`;
    if (family) root.style.setProperty("--accessible-font", family);
    else root.style.removeProperty("--accessible-font");
    root.classList.toggle("alto-contraste", settings.theme === "contraste");
    root.classList.toggle("dark", settings.theme === "escuro");
    try {
      localStorage.setItem("climatutor-accessibility", JSON.stringify(settings));
      localStorage.setItem("alto-contraste", settings.theme === "contraste" ? "1" : "0");
    } catch { /* Settings still apply without storage. */ }
  }, [settings, ready]);
  const update = (patch: Partial<AccessibilitySettings>) => setSettings((current) => normalizeSettings({ ...current, ...patch }));
  return { settings, update };
}

export function AccessibilityMenu({ settings, update }: ReturnType<typeof useAccessibility>) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="ml-auto min-h-11 shrink-0 px-3" aria-label="Menu de acessibilidade">
          <IconeAcessibilidade className="size-5!" /><span className="hidden sm:inline">Acessibilidade</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} aria-label="Acessibilidade" className="accessibility-panel w-80 max-w-[calc(100vw-24px)] space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Acessibilidade</h2>
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Fechar menu de acessibilidade" onClick={() => setOpen(false)}><X /></Button>
        </div>
        <section className="space-y-3">
          <div className="flex justify-between text-sm font-medium"><h3 id="text-size-label">Tamanho da fonte</h3><output aria-live="polite" className="tabular-nums">{settings.size}%</output></div>
          <Slider aria-labelledby="text-size-label" min={80} max={200} step={10} value={[settings.size]} onValueChange={([size = 100]) => update({ size })} />
        </section>
        <div className="space-y-2">
          <label id="font-label" className="text-sm font-medium">Fonte</label>
          <Select value={settings.font} onValueChange={(font) => update({ font })}>
            <SelectTrigger aria-labelledby="font-label" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{FONT_OPTIONS.map((font) => <SelectItem key={font.value} value={font.value} className="min-h-11">{font.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label id="theme-label" className="flex items-center gap-2 text-sm font-medium"><Contrast className="size-4" />Tema</label>
          <Select value={settings.theme} onValueChange={(theme) => update({ theme: theme as Theme })}>
            <SelectTrigger aria-labelledby="theme-label" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{THEMES.map((t) => <SelectItem key={t.value} value={t.value} className="min-h-11">{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <section className="space-y-3">
          <div className="flex justify-between text-sm font-medium"><h3 id="speech-speed-label">Velocidade da leitura</h3><output aria-live="polite" className="tabular-nums">{settings.speed.toFixed(1).replace(".", ",")}×</output></div>
          <Slider aria-labelledby="speech-speed-label" min={0.5} max={2} step={0.1} value={[settings.speed]} onValueChange={([speed = 1]) => update({ speed: Math.round(speed * 10) / 10 })} />
        </section>
        <Button variant="ghost" className="min-h-11 w-full whitespace-normal" onClick={() => update(DEFAULT_SETTINGS)}><RotateCcw />Restaurar padrão</Button>
      </PopoverContent>
    </Popover>
  );
}