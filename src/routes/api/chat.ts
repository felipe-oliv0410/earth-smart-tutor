import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages } from "ai";
import {
  createLovableAiGatewayResponsesProvider,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

import { createOpenAI } from "@ai-sdk/openai";
import { tutorPrompt } from "@/lib/tutor-prompts.server";

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

        const { messages, modo } = (await request.json()) as {
          messages: never[];
          modo?: string;
        };
        const modelMessages = await convertToModelMessages(messages);
        const sistema = tutorPrompt(modo);

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayResponsesProvider(
          lovableApiKey,
          initialRunId,
        );

        // Com OPENAI_API_KEY, as respostas são cobradas direto na conta OpenAI.
        const openaiKey = process.env["OPENAI_API_KEY"];
        const model = openaiKey
          ? createOpenAI({ apiKey: openaiKey }).responses("gpt-5.1")
          : gateway.responses("openai/gpt-6-astra");
        const result = streamText({
          model,
          system: sistema,
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

        // Conta OpenAI própria: sem o gateway, não há run id para anexar.
        if (openaiKey) {
          return result.toUIMessageStreamResponse({ sendReasoning: true });
        }

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
