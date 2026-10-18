import { tutorPrompt } from "./tutor-prompts.server";
import { normalizeVoiceContext, type VoiceContext } from "./live-context";

import {
  GatewayError,
  connectLive,
  streamResponse,
  type LiveCommand,
  type LiveEvent,
  type ResponsesInputItem,
  type ResponsesResponse,
} from "@lovable.dev/ai-gateway";

export type LiveConfig = {
  liveModel: "openai/gpt-live-1";
  backendModel: "openai/gpt-6-astra";
  openingInstructions?: string;
};

// Fill the literal model slugs from co-loaded knowledge before typechecking.
const liveSettings = { liveModel: "openai/gpt-live-1", backendModel: "openai/gpt-6-astra" } as const;

export type LiveSocket = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: unknown) => void): void;
  onClose(handler: () => void): void;
  onError(handler: () => void): void;
};

export type LiveExecutionContext = { waitUntil(task: Promise<unknown>): void };

type WorkerSocket = WebSocket & { accept(): void };
declare const WebSocketPair: { new (): { 0: WorkerSocket; 1: WorkerSocket } };
type Transcript = {
  role: "user" | "assistant";
  text: string;
  start_ms: number;
  end_ms: number;
  listeningSound: boolean;
};
type ProviderEvent = LiveEvent<LiveConfig["liveModel"]>;
type DelegationEvent = Extract<ProviderEvent, { type: "session.delegation.created" }>;
type VoiceSession = Awaited<ReturnType<typeof connectLive>>;

export function getLiveConfig(): LiveConfig {
  return { ...liveSettings };

}

export function validateLiveUpgrade(request: Request, options: { allowMissingOrigin?: boolean } = {}): Response | null {
  const origin = request.headers.get("origin");
  if (origin === null ? !options.allowMissingOrigin : origin !== new URL(request.url).origin) {
    return new Response("Voice connection origin rejected", { status: 403 });
  }
  if (request.method !== "GET" || request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("WebSocket required", { status: 426 });
  }
  return null;
}

function workerSocket(socket: WorkerSocket): LiveSocket {
  return {
    get readyState() {
      return socket.readyState;
    },
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (handler) => socket.addEventListener("message", (event) => handler(event.data)),
    onClose: (handler) => socket.addEventListener("close", handler),
    onError: (handler) => socket.addEventListener("error", handler),
  };
}

export function handleLiveRequest(request: Request): Response {
  const waitUntil = (request as Request & Partial<LiveExecutionContext>).waitUntil;
  if (!waitUntil) return new Response("Live runtime unavailable", { status: 503 });
  const config = getLiveConfig();
  const rejected = validateLiveUpgrade(request);
  if (rejected) return rejected;
  const pair = new WebSocketPair();
  pair[1].accept();
  bindLiveConnection(workerSocket(pair[1]), config, { waitUntil });
  const response: ResponseInit & { webSocket: WebSocket } = { status: 101, webSocket: pair[0] };
  return new Response(null, response);
}

function conversationInstructions(context: VoiceContext) {
  return `${tutorPrompt(context.mode)}
Adaptação para conversa falada: você é o ClimaTutor. Fale sempre em português do Brasil, com voz natural, calma e acolhedora. Não leia marcações de markdown. Responda brevemente, respeitando o método e o escopo do tutor selecionado.
Ritmo: ${context.speed < 0.9 ? "fale devagar, com pausas" : context.speed >= 1.2 ? "fale um pouco mais rápido, sem perder a clareza" : "fale em ritmo natural"}. Mantenha o tom natural da voz.
Backchannel policy: Use sons curtos e moderados de escuta sem tomar a conversa.
Interruption policy: Ao ouvir uma interrupção, pare a fala e escute. Se o aluno disser pare, aguarde a próxima solicitação. Se pedir repita, repita a última explicação; se pedir explique novamente, reformule com um exemplo mais simples. Interrupções não encerram a sessão.
Delegation policy:
Backend tools: O tutor especializado analisa questões climáticas e sustenta a orientação pedagógica do modo selecionado.
Delegate to the backend when: O aluno pedir análise detalhada, comparação de soluções, políticas climáticas ou corrigir uma questão em análise. Aguarde o resultado verificado antes de responder.
Do not delegate to the backend when: Cumprimentar, fazer uma pergunta simples, parar a fala ou repetir uma explicação atual. Não invente dados nem alegue realizar ações externas.`;
}

function voiceError(error: unknown): string {
  if (error instanceof GatewayError) {
    console.error("Live Gateway failure", { code: error.code, ids: error.ids, outcome: error.outcome });
    if (error.code === "payment_required") return "Os créditos de IA acabaram. O responsável pelo projeto precisa adicionar créditos.";
    if (error.code === "permission_denied") return "O serviço de voz não está autorizado para este projeto. O responsável precisa verificar o acesso.";
    if (error.code === "rate_limited") return "O serviço de voz está ocupado. Aguarde antes de iniciar outra conversa.";
  }
  return "Não foi possível concluir a conversa por voz. Tente novamente quando o serviço estiver disponível.";
}

function isListeningSound(text: string) {
  const normalized = text.toLowerCase().replace(/[\s\p{Pd}]/gu, "");
  return /^(?:m+hm+|uhhuh)[.,!]*$/.test(normalized);
}

async function answerQuestion(
  messages: ResponsesInputItem[],
  config: LiveConfig,
  context: VoiceContext,
  correlation: { runID: string; sessionID: string; delegationID: string },
  signal: AbortSignal,
  consumeInput: () => void,
) {
  signal.throwIfAborted();
  consumeInput();
  const stream = await streamResponse({
    model: config.backendModel,
    input: messages,
    instructions: tutorPrompt(context.mode) + "\nResponda em português do Brasil para uma conversa falada, sem markdown. Use a correção mais recente do aluno e respeite as regras pedagógicas do tutor. Nunca invente números. Não execute ações externas.",
    reasoning: { effort: "low", summary: "auto" },
    include: ["reasoning.encrypted_content"],
  }, {
    signal,
    runId: correlation.runID,
    metadata: { live_session_id: correlation.sessionID, delegation_id: correlation.delegationID },
  });
  let completed: ResponsesResponse | undefined;
  let incomplete = false;
  for await (const event of stream) {
    if (event.type === "response.completed") completed = event.response;
    if (event.type === "response.incomplete") incomplete = true;
  }
  signal.throwIfAborted();
  if (incomplete || !completed || completed.status !== "completed") throw new Error("Tutor response incomplete");
  for (const item of completed.output) {
    if (item.type !== "message" && item.type !== "reasoning") throw new Error("Unexpected tutor output");
    messages.push(item);
  }
  const answer = completed.output.flatMap(item => item.type === "message" ? item.content.flatMap(part => part.type === "output_text" ? [part.text] : []) : []).join("\n");
  if (!answer.trim()) throw new Error("Empty tutor answer");
  return answer;
}

function* commentaryChunks(content: string) {
  const encoder = new TextEncoder();
  let chunk = "";
  let bytes = 0;
  for (const [word] of content.matchAll(/\S+\s*|\s+/gu)) {
    // Chunks stay well inside the provider's per-append size limit.
    if (chunk && bytes + encoder.encode(word).length > 480) {
      yield chunk;
      chunk = "";
      bytes = 0;
    }
    for (const character of word) {
      const size = encoder.encode(character).length;
      if (bytes + size > 480) {
        yield chunk;
        chunk = "";
        bytes = 0;
      }
      chunk += character;
      bytes += size;
    }
  }
  if (chunk) yield chunk;
}

export function bindLiveConnection(
  browser: LiveSocket,
  configuration: LiveConfig,
  execution: LiveExecutionContext,
): void {
  const config = { ...configuration };
  let context = normalizeVoiceContext({});
  const runID = crypto.randomUUID();
  const setupAbort = new AbortController();
  let gateway: VoiceSession | undefined;
  let sessionID: string | undefined;
  let starting = false;
  let closing = false;
  let finished = false;
  let revision = 0;
  let task: AbortController | undefined;
  const pendingDelegations: Array<{
    event: DelegationEvent;
  }> = [];
  let completedDelegation: (typeof pendingDelegations)[number] | undefined;
  const backendMessages: ResponsesInputItem[] = [];
  let transcriptCursor = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let browserReady = false;
  let greetingRequested = false;
  let greetingCommand: { id: string; type: "instructions" | "commentary" } | undefined;
  let greetingTimer: ReturnType<typeof setTimeout> | undefined;
  const startTimer = setTimeout(() => {
    emit({ type: "app.error", error: { message: "Voice startup message timed out" } });
    stop();
  }, 5000);
  const transcripts: Transcript[] = [];
  const delegations = new Set<string>();

  function emit(event: object) {
    if (browser.readyState !== 1) return;
    try {
      browser.send(JSON.stringify(event));
    } catch {
      stop();
    }
  }

  function close(socket?: LiveSocket) {
    if (!socket || socket.readyState === 3) return;
    try {
      socket.close(1000, "Call ended");
    } catch {
      return;
    }
  }

  function clearGreeting() {
    clearTimeout(greetingTimer);
    greetingCommand = undefined;
  }

  function requestGreeting() {
    const content = (
      config.openingInstructions ??
      "Start the conversation now in your configured language and role. Give a brief greeting suited to this app's purpose, ask one relevant opening question, then listen."
    ).trim();
    if (!content || !browserReady || !sessionID || greetingRequested || closing) return;
    greetingRequested = true;
    if (new TextEncoder().encode(content).length > 480) {
      emit({ type: "app.greeting.error", error: { message: "The opening instructions are too long" } });
      return;
    }
    greetingCommand = { id: crypto.randomUUID(), type: "instructions" };
    greetingTimer = setTimeout(() => {
      clearGreeting();
      emit({ type: "app.greeting.error", error: { message: "The opening could not be confirmed" } });
    }, 10_000);
    sendGateway({
      type: "session.instructions.append",
      event_id: greetingCommand.id,
      delegation_id: null,
      content,
    });
  }

  function discardPendingWork() {
    pendingDelegations.length = 0;
    completedDelegation = undefined;
    clearTimeout(restartTimer);
    task?.abort();
  }

  function finish() {
    if (finished) return;
    finished = closing = true;
    clearTimeout(startTimer);
    clearTimeout(restartTimer);
    clearGreeting();
    discardPendingWork();
    setupAbort.abort();
    if (gateway) execution.waitUntil(gateway.close());
    close(browser);
  }

  function stop() {
    if (closing) return;
    closing = true;
    discardPendingWork();
    clearTimeout(startTimer);
    clearGreeting();
    if (gateway) execution.waitUntil(gateway.close());
    else finish();
  }

  function sendGateway(event: LiveCommand<LiveConfig["liveModel"]>) {
    if (!gateway || closing) return;
    execution.waitUntil(
      gateway.send(event).catch(() => {
        emit({ type: "app.error", error: { message: "Voice command could not be sent" } });
        stop();
      }),
    );
  }

  function scheduleDelegation() {
    clearTimeout(restartTimer);
    if (closing || task || pendingDelegations.length === 0) return;
    restartTimer = setTimeout(() => void runDelegation(), 300);
  }

  function deliverResult(delegationID: string, answer: string) {
    if (closing) return;
    if (!gateway) return stop();
    try {
      for (const content of commentaryChunks(answer)) {
        sendGateway({
          type: "session.commentary.append",
          event_id: crypto.randomUUID(),
          delegation_id: delegationID,
          content,
        });
      }
      completedDelegation = pendingDelegations.shift();
    } catch {
      stop();
    }
  }

  async function runDelegation() {
    const pending = pendingDelegations[0];
    const event = pending?.event;
    const id = event?.delegation?.id;
    if (!pending || !event || !id || !sessionID || closing || task) return;
    if (!transcripts.some(({ role, text }) => role === "user" && text.trim())) return;
    const controller = new AbortController();
    task = controller;
    let taskRevision = revision;
    try {
      const answer = await answerQuestion(
        backendMessages,
        config,
        context,
        { runID, sessionID, delegationID: id },
        controller.signal,
        () => {
          const updates = transcripts.slice(transcriptCursor);
          backendMessages.push(...updates.map(({ role, text }) => ({ role, content: text })));
          transcriptCursor = transcripts.length;
          taskRevision = revision;
        },
      );
      if (closing || controller.signal.aborted) return;
      if (taskRevision !== revision) return;
      deliverResult(id, answer.trim());
    } catch (error) {
      if (closing || controller.signal.aborted) return;
      if (error instanceof GatewayError) {
        emit({ type: "app.error", error: { message: voiceError(error) } });
        return stop();
      }
      backendMessages.push({
        role: "assistant",
        content:
          "A tentativa do tutor falhou. Não apresente o resultado parcial como concluído.",
      });
      if (taskRevision !== revision) return;
      deliverResult(id, "Não consegui concluir esta explicação. Pergunte ao aluno se deseja tentar novamente.");
    } finally {
      if (task === controller) task = undefined;
      scheduleDelegation();
    }
  }

  function queueDelegation(event: DelegationEvent) {
    pendingDelegations.push({ event });
    emit({ type: "app.delegation.pending", delegation_id: event.delegation?.id });
    scheduleDelegation();
  }

  function receiveGateway(event: ProviderEvent) {
    try {
      if (browser.readyState === 1) browser.send(JSON.stringify(event));
      if (event.type === "session.closed") return finish();
      if (event.type === "gateway.session.closing" || event.type === "gateway.error") {
        return stop();
      }
      if (closing) return;
      if (event.type === "gateway.session.created") {
        sessionID = event.session?.id;
        requestGreeting();
      }
      if (
        greetingCommand &&
        event.type === `session.${greetingCommand.type}.appended` &&
        "client_event_id" in event &&
        event.client_event_id === greetingCommand.id
      ) {
        if (greetingCommand.type === "instructions") {
          greetingCommand = { id: crypto.randomUUID(), type: "commentary" };
          sendGateway({
            type: "session.commentary.append",
            event_id: greetingCommand.id,
            delegation_id: null,
            content: "Comece a conversa agora em português do Brasil, seguindo as instruções fornecidas.",
          });
        } else {
          clearGreeting();
          emit({ type: "app.greeting.accepted" });
        }
      } else if (greetingCommand && event.type === "error" && event.error?.client_event_id === greetingCommand.id) {
        clearGreeting();
        emit({ type: "app.greeting.error", error: { message: event.error.message ?? "The opening was rejected" } });
      }
      if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
        const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
        if (!event.delta?.trim()) return;
        const listeningSound = role === "user" && Boolean(task) && isListeningSound(event.delta);
        transcripts.push({
          role,
          text: event.delta,
          start_ms: event.start_ms ?? 0,
          end_ms: event.end_ms ?? 0,
          listeningSound,
        });
        if (listeningSound) return;
        if (role === "user") {
          revision++;
          const offset = completedDelegation?.event.offset_ms;
          // Live has no transcript watermark; completed handoffs can receive late context.
          if (
            pendingDelegations.length === 0 &&
            completedDelegation &&
            typeof offset === "number" &&
            Number.isFinite(offset) &&
            offset >= 0 &&
            typeof event.start_ms === "number" &&
            Number.isFinite(event.start_ms) &&
            event.start_ms >= 0 &&
            event.start_ms <= offset
          ) {
            pendingDelegations.push(completedDelegation);
            completedDelegation = undefined;
          }
          if (pendingDelegations.length) {
            emit({ type: "app.delegation.pending", delegation_id: pendingDelegations[0]?.event.delegation?.id });
          }
        }
        scheduleDelegation();
      } else if (event.type === "session.delegation.created") {
        const id = event.delegation?.id;
        if (id && event.delegation?.target === "client" && !delegations.has(id)) {
          delegations.add(id);
          queueDelegation(event);
        }
      }
    } catch {
      emit({ type: "app.error", error: { message: "Invalid voice event or lost connection" } });
      stop();
    }
  }

  async function startSession(sdp: string) {
    if (closing || browser.readyState !== 1) return;
    clearTimeout(startTimer);
    const accepted = await connectLive(
      {
        type: "session.start",
        session: {
          model: config.liveModel,
          instructions: conversationInstructions(context),
          store: false,
          input: context.history.map(({ role, text }) => role === "user" ? { role, content: [{ type: "input_text", text }] } : { role, content: [{ type: "output_text", text }] }),
          audio: { output: { voice: "marin" } },
          delegation: { type: "client" },
        },
        transport: { type: "webrtc", sdp },
      },
      { signal: setupAbort.signal, runId: runID },
    );
    if (closing || browser.readyState !== 1) {
      execution.waitUntil(accepted.close());
      return;
    }
    gateway = accepted;
    execution.waitUntil(
      (async () => {
        try {
          for await (const event of accepted) receiveGateway(event);
        } catch (error) {
          if (!closing) emit({ type: "app.error", error: { message: voiceError(error) } });
        } finally {
          finish();
        }
      })(),
    );
  }

  browser.onMessage((data) => {
    try {
      if (typeof data !== "string" || data.length > 64 * 1024) throw new Error("Invalid client message");
      const event = JSON.parse(data);
      if (event.type === "session.close") return stop();
      if (closing) return;
      if (!gateway) {
        if (starting || event.type !== "app.start" || typeof event.sdp !== "string" || !event.sdp.trim()) {
          throw new Error("Voice startup message required");
        }
        context = normalizeVoiceContext(event.context);
        backendMessages.push(...context.history.map(({ role, text }) => ({ role, content: text })));
        config.openingInstructions = context.history.length
          ? "Cumprimente brevemente em português do Brasil e diga que podemos continuar a conversa sobre clima. Não repita explicações anteriores sem o aluno pedir. Faça uma pergunta curta e escute."
          : "Inicie agora em português do Brasil. Use a frase de INÍCIO do tutor selecionado, se houver; caso contrário diga: Oi! Sou o ClimaTutor. O que você gostaria de entender sobre o clima hoje? Depois escute.";
        starting = true;
        execution.waitUntil(
          startSession(event.sdp).catch((error) => {
            if (!closing)
              emit({
                type: "app.error",
                error: { message: voiceError(error) },
              });
            stop();
          }),
        );
        return;
      }
      if (event.type === "app.ready") {
        browserReady = true;
        requestGreeting();
        return;
      }
      if (event.type !== "gateway.heartbeat") {
        throw new Error("Unsupported client event");
      }
      sendGateway({ type: "gateway.heartbeat" });
    } catch {
      emit({ type: "app.error", error: { message: "Voice connection could not be started or continued" } });
      stop();
    }
  });
  browser.onClose(stop);
  browser.onError(stop);
}
