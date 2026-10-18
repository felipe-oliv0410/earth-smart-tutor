import { Mic, MicOff, Phone, PhoneOff, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useLiveVoice } from "@/hooks/use-live-voice";

export function LiveVoiceControls({ call, seconds }: { call: ReturnType<typeof useLiveVoice>; seconds: number | null }) {
  const active = call.status === "connecting" || call.status === "connected";
  const labels = { idle: "", connecting: "Conectando…", connected: "Conversa por voz ativa", stopping: "Encerrando…", closed: "Conversa encerrada" };
  return <section className="space-y-2" aria-label="Modo voz">
    <h3 className="text-sm font-medium">Modo voz</h3>
    <div className="flex flex-wrap gap-2">
      <Button className="min-h-11 flex-1 whitespace-normal" variant={active ? "destructive" : "default"} disabled={call.status === "stopping"} onClick={active ? call.stop : call.start}>
        {active ? <PhoneOff /> : <Phone />}{active ? "Encerrar modo voz" : "Iniciar modo voz"}
      </Button>
      {call.status === "connected" && <Button variant="outline" size="icon" className="min-h-11 min-w-11" aria-label={call.muted ? "Ativar microfone" : "Silenciar microfone"} title={call.muted ? "Ativar microfone" : "Silenciar microfone"} onClick={() => call.setMuted(!call.muted)}>{call.muted ? <MicOff /> : <Mic />}</Button>}
      {call.playbackBlocked && <Button variant="outline" className="min-h-11" onClick={call.resumePlayback}><Play />Ouvir tutor</Button>}
    </div>
    <p role="status" className="text-xs text-muted-foreground">{labels[call.status]}{call.muted && active ? " · Microfone silenciado" : ""}</p>
    {seconds !== null && <p className="text-xs text-muted-foreground">Uso de voz: {seconds.toFixed(0)} segundos{call.status === "closed" && !call.finalized ? " · Total final não confirmado" : ""}</p>}
    {call.error && <p role="alert" className="text-sm text-destructive break-words">{call.error}</p>}
  </section>;
}