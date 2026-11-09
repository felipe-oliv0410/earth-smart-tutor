import { createFileRoute } from "@tanstack/react-router";
import { tutorPrompt } from "@/lib/tutor-prompts.server";
import { normalizeVoiceContext, realtimeSpeed } from "@/lib/live-context";

// Cria uma chave temporária da OpenAI para o modo voz; a cobrança vai para a conta OpenAI do projeto.
export const Route = createFileRoute("/api/realtime")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("origin") !== new URL(request.url).origin) return new Response("Origem recusada", { status: 403 });
        const key = process.env["OPENAI_API_KEY"];
        if (!key) return Response.json({ error: "Chave da OpenAI ausente no servidor." }, { status: 500 });
        const context = normalizeVoiceContext(await request.json().catch(() => ({})));
        const history = context.history.map((m) => `${m.role === "user" ? "Aluno" : "Tutor"}: ${m.text}`).join("\n");
        const instructions = `${tutorPrompt(context.mode)}
Conversa falada: fale sempre em português do Brasil, com voz natural, calma e acolhedora, sem ler markdown, e responda de forma breve.
Se o aluno disser "pare", pare e aguarde. Se pedir "repita", repita a última explicação; se pedir "explique novamente", reformule com um exemplo mais simples.
Comece cumprimentando brevemente e fazendo uma pergunta inicial adequada ao modo.${history ? `\nConversa escrita até agora:\n${history}` : ""}`;
        const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            session: {
              type: "realtime",
              model: "gpt-realtime",
              instructions,
              audio: {
                input: { transcription: { model: "gpt-4o-mini-transcribe", language: "pt" } },
                output: { voice: "marin", speed: realtimeSpeed(context.speed) },
              },
            },
          }),
        });
        if (!res.ok) {
          console.error("OpenAI realtime", res.status, await res.text());
          return Response.json({ error: res.status === 429 ? "A conta OpenAI está sem saldo ou ocupada." : "Não foi possível iniciar o modo voz." }, { status: 502 });
        }
        const data = (await res.json()) as { value: string };
        return Response.json({ value: data.value });
      },
    },
  },
});
