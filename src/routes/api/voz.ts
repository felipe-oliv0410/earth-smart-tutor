import { createFileRoute } from "@tanstack/react-router";

// Lê um texto em voz alta com IA (voz natural em português).
// Para trocar a voz, mude VOZ (ex.: "Kore", "Puck", "Aoede", "Charon").
const VOZ = "Kore";

export const Route = createFileRoute("/api/voz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { text } = (await request.json()) as { text?: string };
        if (!text || typeof text !== "string") return new Response("Texto ausente", { status: 400 });
        const limpo = text.replace(/[*#_`>|-]+/g, " ").slice(0, 4000);

        const resposta = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env['LOVABLE_API_KEY']}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-tts-preview",
            contents: [{ role: "user", parts: [{ text: `Leia em português do Brasil, com tom calmo e acolhedor de professor: ${limpo}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOZ } } },
            },
            stream_format: "sse",
          }),
          signal: request.signal,
        });

        if (!resposta.ok || !resposta.body) {
          return new Response(await resposta.text(), { status: resposta.status });
        }
        return new Response(resposta.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
        });
      },
    },
  },
});
