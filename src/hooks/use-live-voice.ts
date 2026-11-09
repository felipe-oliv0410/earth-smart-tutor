import type { VoiceContext } from "@/lib/live-context";
import { useCallback, useEffect, useRef, useState } from "react";

// Modo voz: conexão WebRTC direta com a OpenAI usando uma chave temporária criada em /api/realtime.
export type LiveEvent = { type: string; [key: string]: unknown };
type Status = "idle" | "connecting" | "connected" | "stopping" | "closed";

export function useLiveVoice(options: { context?: VoiceContext; onEvent?: (event: LiveEvent) => void } = {}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const latest = useRef(options);
  const session = useRef<{ pc: RTCPeerConnection; mic: MediaStream; dc: RTCDataChannel } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  useEffect(() => { latest.current = options; });

  const cleanup = useCallback(() => {
    const s = session.current;
    session.current = null;
    s?.mic.getTracks().forEach((t) => t.stop());
    s?.dc.close();
    s?.pc.close();
    if (audioRef.current) audioRef.current.srcObject = null;
    setMutedState(false);
    setPlaybackBlocked(false);
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setStatus((s) => (s === "idle" ? s : "closed"));
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    if (session.current) return;
    setError(null);
    setStatus("connecting");
    let mic: MediaStream | undefined;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tokenRes = await fetch("/api/realtime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(latest.current.context ?? {}) });
      const token = (await tokenRes.json()) as { value?: string; error?: string };
      if (!token.value) throw new Error(token.error ?? "Não foi possível iniciar o modo voz.");
      const pc = new RTCPeerConnection();
      pc.ontrack = (e) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.srcObject = e.streams[0] ?? null;
        audio.play().catch(() => setPlaybackBlocked(true));
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") { setError("A conexão de voz caiu. Inicie novamente."); stop(); }
      };
      mic.getTracks().forEach((t) => pc.addTrack(t, mic!));
      const dc = pc.createDataChannel("oai-events");
      session.current = { pc, mic, dc };
      dc.onopen = () => { setStatus("connected"); dc.send(JSON.stringify({ type: "response.create" })); };
      dc.onmessage = (e) => {
        const event = JSON.parse(e.data as string) as LiveEvent;
        if (event.type === "error") console.error("Realtime", event);
        latest.current.onEvent?.(event);
      };
      await pc.setLocalDescription(await pc.createOffer());
      const sdp = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: pc.localDescription?.sdp ?? "",
        headers: { Authorization: `Bearer ${token.value}`, "Content-Type": "application/sdp" },
      });
      if (!sdp.ok) throw new Error("A OpenAI recusou a conexão de voz.");
      if (session.current?.pc !== pc) return;
      await pc.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
    } catch (e) {
      if (!session.current) mic?.getTracks().forEach((t) => t.stop());
      cleanup();
      setError(e instanceof Error ? e.message : "Não foi possível iniciar o modo voz.");
      setStatus("closed");
    }
  }, [cleanup, stop]);

  const setMuted = useCallback((value: boolean) => {
    session.current?.mic.getTracks().forEach((t) => (t.enabled = !value));
    setMutedState(value);
  }, []);

  const resumePlayback = useCallback(() => {
    audioRef.current?.play().then(() => setPlaybackBlocked(false)).catch(() => undefined);
  }, []);

  return { status, error, muted, playbackBlocked, audioRef, start, stop, setMuted, resumePlayback };
}
