import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import {
  Brain,
  Contrast,
  Mic,
  MicOff,
  RotateCcw,
  Sprout,
  Volume2,
  VolumeX,
} from "lucide-react";
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

// --- Acessibilidade por voz (usa recursos do próprio navegador) ---
type SpeechRecognitionType = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

function useVozParaTexto(aoTranscrever: (texto: string) => void) {
  const [ouvindo, setOuvindo] = useState(false);
  const [suportado, setSuportado] = useState(false);
  const reconhecimento = useRef<SpeechRecognitionType | null>(null);

  useEffect(() => {
    setSuportado(
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
    );
  }, []);

  const alternar = () => {
    if (!suportado) return;
    if (ouvindo) {
      reconhecimento.current?.stop();
      return;
    }
    const win = window as unknown as Record<
      string,
      (new () => SpeechRecognitionType) | undefined
    >;
    const Ctor = win["SpeechRecognition"] ?? win["webkitSpeechRecognition"];
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const trecho = e.results[0]?.[0]?.transcript;
      if (trecho) aoTranscrever(trecho);
    };
    rec.onend = () => setOuvindo(false);
    reconhecimento.current = rec;
    rec.start();
    setOuvindo(true);
  };

  return { suportado, ouvindo, alternar };
}

function BotaoOuvir({ texto }: { texto: string }) {
  const [falando, setFalando] = useState(false);
  const [suportado, setSuportado] = useState(false);

  useEffect(() => {
    setSuportado("speechSynthesis" in window);
    return () => window.speechSynthesis?.cancel();
  }, []);

  if (!suportado) return null;

  const alternar = () => {
    if (falando) {
      window.speechSynthesis.cancel();
      setFalando(false);
      return;
    }
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.onend = () => setFalando(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(fala);
    setFalando(true);
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={falando ? "Parar leitura em voz alta" : "Ouvir resposta em voz alta"}
      className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
    >
      {falando ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
      {falando ? "Parar leitura" : "Ouvir resposta"}
    </button>
  );
}
// --- Fim dos recursos de voz ---

// --- Alto contraste ---
// Botão que alterna cores de alto contraste e salva a preferência no navegador.
function useAltoContraste() {
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem("alto-contraste") === "1";
    setAtivo(salvo);
    document.documentElement.classList.toggle("alto-contraste", salvo);
  }, []);

  const alternar = () => {
    const novo = !ativo;
    setAtivo(novo);
    document.documentElement.classList.toggle("alto-contraste", novo);
    localStorage.setItem("alto-contraste", novo ? "1" : "0");
  };

  return { ativo, alternar };
}
// --- Fim do alto contraste ---

function Index() {
  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    transport,
  });
  const [input, setInput] = useState("");
  const voz = useVozParaTexto((texto) => setInput((atual) => (atual ? `${atual} ${texto}` : texto)));
  const contraste = useAltoContraste();

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
          <button
            type="button"
            onClick={contraste.alternar}
            aria-label={contraste.ativo ? "Desativar alto contraste" : "Ativar alto contraste"}
            aria-pressed={contraste.ativo}
            className={`ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
              contraste.ativo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-secondary-foreground hover:bg-secondary"
            }`}
          >
            <Contrast className="size-4" />
            Alto contraste
          </button>
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

          {messages.map((message) => {
            const textoDaMensagem = message.parts
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("\n");
            return (
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
                  {message.role === "assistant" && textoDaMensagem && (
                    <BotaoOuvir texto={textoDaMensagem} />
                  )}
                </MessageContent>
              </Message>
            );
          })}

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
              {voz.suportado && (
                <button
                  type="button"
                  onClick={voz.alternar}
                  aria-label={voz.ouvindo ? "Parar de gravar pergunta por voz" : "Fazer pergunta por voz"}
                  className={`mr-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    voz.ouvindo
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  }`}
                >
                  {voz.ouvindo ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                  {voz.ouvindo ? "Ouvindo... toque para parar" : "Falar pergunta"}
                </button>
              )}
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
