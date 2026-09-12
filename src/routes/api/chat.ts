import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages } from "ai";
import {
  createLovableAiGatewayResponsesProvider,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `Você é o ClimaTutor, um tutor de educação climática para estudantes do ensino médio brasileiro.

Sua missão:
- Ensinar sobre mudanças climáticas, causas, consequências e soluções de forma clara, precisa e baseada em ciência (consenso do IPCC).
- Usar linguagem acessível e acolhedora para jovens de 14 a 18 anos, sempre em português brasileiro.
- Conectar os temas ao cotidiano do estudante e à realidade brasileira (Amazônia, Cerrado, energia, consumo, cidades).

Como ensinar:
- Explique com exemplos concretos e analogias simples; evite jargão sem explicação.
- Estruture respostas com markdown: títulos curtos, listas e **negrito** para conceitos-chave.
- Ao final de explicações mais longas, faça uma pergunta de verificação ("Consegue me dizer com suas palavras...?") para engajar o aluno.
- Se o aluno errar um conceito, corrija com gentileza e reforce o aprendizado.
- Temas fora de educação climática: redirecione com simpatia para o tema do clima.
- Seja motivador: mostre que ações individuais e coletivas fazem diferença, sem alarmismo paralisante.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableApiKey = process.env["LOVABLE_API_KEY"];
        if (!lovableApiKey) {
          return Response.json(
            { error: "Configuração de IA ausente no servidor." },
            { status: 500 },
          );
        }

        const { messages } = (await request.json()) as { messages: never[] };
        const modelMessages = await convertToModelMessages(messages);

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayResponsesProvider(
          lovableApiKey,
          initialRunId,
        );

        const result = streamText({
          model: gateway.responses("openai/gpt-6-astra"),
          system: SYSTEM_PROMPT,
          messages: modelMessages,
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const response = result.toUIMessageStreamResponse({
          sendReasoning: true,
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
