import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
const model = createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).responses("gpt-5.1");
const t0 = Date.now();
try {
  const r = streamText({
    model,
    system: "Você é um tutor de clima. Responda curto.",
    messages: [{ role: "user", content: "O que é efeito estufa? Uma frase." }],
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  });
  let n = 0;
  for await (const c of r.textStream) {
    n++;
    if (n === 1) console.log("FIRST CHUNK after", Date.now() - t0, "ms");
    process.stdout.write(c);
  }
  console.log("\nDONE, chunks:", n, "elapsed", Date.now() - t0, "ms");
} catch (e) {
  console.log("THROWN after", Date.now() - t0, "ms:", e?.name, String(e?.message).slice(0, 300));
}
