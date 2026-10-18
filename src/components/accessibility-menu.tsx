import { useEffect, useState } from "react";
import { Contrast, Minus, Plus, RotateCcw, X } from "lucide-react";
import { IconeAcessibilidade } from "@/components/icons/acessibilidade";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SETTINGS, FONT_OPTIONS, normalizeSettings, type AccessibilitySettings } from "@/lib/accessibility";

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
    root.classList.toggle("alto-contraste", settings.contrast);
    try {
      localStorage.setItem("climatutor-accessibility", JSON.stringify(settings));
      localStorage.setItem("alto-contraste", settings.contrast ? "1" : "0");
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
        <section aria-labelledby="text-size-label" className="space-y-2">
          <h3 id="text-size-label" className="text-sm font-medium">Tamanho da fonte</h3>
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Diminuir tamanho da fonte" disabled={settings.size <= 80} onClick={() => update({ size: settings.size - 10 })}><Minus /></Button>
            <output aria-live="polite" className="text-sm tabular-nums">{settings.size}%</output>
            <Button variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Aumentar tamanho da fonte" disabled={settings.size >= 200} onClick={() => update({ size: settings.size + 10 })}><Plus /></Button>
          </div>
        </section>
        <div className="space-y-2">
          <label id="font-label" className="text-sm font-medium">Fonte</label>
          <Select value={settings.font} onValueChange={(font) => update({ font })}>
            <SelectTrigger aria-labelledby="font-label" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{FONT_OPTIONS.map((font) => <SelectItem key={font.value} value={font.value} className="min-h-11">{font.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3 border-y border-border py-3">
          <label htmlFor="contrast-switch" className="flex items-center gap-2 text-sm font-medium"><Contrast className="size-4" />Alto contraste</label>
          <Switch id="contrast-switch" checked={settings.contrast} onCheckedChange={(contrast) => update({ contrast })} />
        </div>
        <section aria-labelledby="speech-speed-label" className="space-y-2">
          <h3 id="speech-speed-label" className="text-sm font-medium">Velocidade da leitura</h3>
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Diminuir velocidade da leitura" disabled={settings.speed <= 0.5} onClick={() => update({ speed: Math.round((settings.speed - 0.1) * 10) / 10 })}><Minus /></Button>
            <output aria-live="polite" className="text-sm tabular-nums">{settings.speed.toFixed(1).replace(".", ",")}×</output>
            <Button variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Aumentar velocidade da leitura" disabled={settings.speed >= 2} onClick={() => update({ speed: Math.round((settings.speed + 0.1) * 10) / 10 })}><Plus /></Button>
          </div>
        </section>
        <Button variant="ghost" className="min-h-11 w-full whitespace-normal" onClick={() => update(DEFAULT_SETTINGS)}><RotateCcw />Restaurar padrão</Button>
      </PopoverContent>
    </Popover>
  );
}