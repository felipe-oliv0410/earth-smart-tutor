import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Brain, RotateCcw, Sprout } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import logo from "@/assets/logo.png";

// Textos do app — edite aqui para mudar o conteúdo da tela.
const TITULO = "ClimaTutor — Tutor de IA sobre Educação Climática";
const DESCRICAO =
  "Converse com o ClimaTutor, um tutor de IA que ensina mudanças climáticas, sustentabilidade e soluções para estudantes do ensino médio.";
const SUGESTOES = [
  "O que é o efeito estufa?",
  "Por que a Amazônia importa para o clima?",
  "O que são energias renováveis?",
  "Como posso reduzir minha pegada de carbono?",
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESCRICAO },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESCRICAO },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const transport = new DefaultChatTransport({ api: "/api/chat" });

function Index() {
  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    transport,
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <img src={logo} alt="ClimaTutor" className="size-10" />
          <div>
            <h1 className="font-display text-xl font-semibold leading-tight text-foreground">
              ClimaTutor
            </h1>
            <p className="text-xs text-muted-foreground">
              Seu tutor de IA sobre educação climática
            </p>
          </div>
        </div>
      </header>

      <Conversation className="mx-auto w-full max-w-3xl flex-1">
        <ConversationContent className="gap-6 px-4 py-6">
          {messages.length === 0 && (
            <ConversationEmptyState>
              <div className="flex flex-col items-center gap-4 px-4 text-center">
                <img src={logo} alt="" className="size-24" />
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Vamos aprender sobre o clima?
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Tire dúvidas sobre aquecimento global, sustentabilidade,
                  energia limpa e muito mais. Escolha um tema ou escreva sua
                  pergunta.
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage({ text: s })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-secondary-foreground transition-colors hover:bg-secondary"
                    >
                      <Sprout className="size-3.5 text-leaf" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          )}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, i) =>
                  part.type === "reasoning" ? (
                    <details
                      key={i}
                      className="mb-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
                    >
                      <summary className="flex cursor-pointer items-center gap-1.5 font-medium">
                        <Brain className="size-3.5" />
                        Raciocínio do tutor
                      </summary>
                      <p className="mt-1.5 whitespace-pre-wrap">{part.text}</p>
                    </details>
                  ) : part.type === "text" ? (
                    <MessageResponse key={i}>{part.text}</MessageResponse>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Pensando na sua pergunta...</Shimmer>
              </MessageContent>
            </Message>
          )}

          {error && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-center">
              <p className="text-sm text-destructive">
                Não consegui falar com o tutor agora. Tente novamente.
              </p>
              <button
                type="button"
                onClick={() => regenerate()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <RotateCcw className="size-3.5" />
                Tentar de novo
              </button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <footer className="border-t bg-card/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <PromptInput
            onSubmit={({ text }) => {
              if (!text.trim()) return;
              sendMessage({ text: text.trim() });
              setInput("");
            }}
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Pergunte sobre o clima... (ex.: o que é o aquecimento global?)"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={status}
                disabled={!input.trim() && status !== "streaming"}
                onStop={stop}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            O ClimaTutor pode cometer erros. Verifique informações importantes
            com seus professores.
          </p>
        </div>
      </footer>
    </div>
  );
}
