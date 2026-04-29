import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Bot, User, FileText, Eye, Loader2, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AGENT_PERSONAS = {
  "Agente Kardex": {
    id: "kardex",
    color: "text-umsa-green",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderColor: "border-emerald-300 dark:border-emerald-700/40",
  },
  "Agente Información": {
    id: "informacion",
    color: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-300 dark:border-blue-700/40",
  },
};

const initialMessage = (agentName) => ({
  id: 1,
  role: "assistant",
  text: `Hola, soy el **${agentName}** de la FCPN. ¿En qué puedo ayudarte hoy?`,
  citedDoc: null,
  timestamp: new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
});

/* ─────────────────────────────────────────────
   Renderizador de Markdown básico
   ───────────────────────────────────────────── */
function renderMarkdown(text) {
  const lines = text.split("\n");
  const result = [];
  let listBuffer = [];

  const flushList = (key) => {
    if (listBuffer.length === 0) return;
    result.push(
      <ul key={`ul-${key}`} className="list-none space-y-0.5 my-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span className="text-umsa-green mt-0.5 shrink-0">•</span>
            <span>{inlineMarkdown(item)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line, idx) => {
    const h4 = line.match(/^#{3,}\s+(.+)/);
    if (h4) {
      flushList(idx);
      result.push(<p key={idx} className="font-bold text-sm mt-2 mb-0.5 text-umsa-green">{inlineMarkdown(h4[1])}</p>);
      return;
    }
    const h2 = line.match(/^#{1,2}\s+(.+)/);
    if (h2) {
      flushList(idx);
      result.push(<p key={idx} className="font-bold text-base mt-3 mb-1">{inlineMarkdown(h2[1])}</p>);
      return;
    }
    const li = line.match(/^\s*[-*]\s+(.+)/);
    if (li) { listBuffer.push(li[1]); return; }
    if (line.trim() === "") { flushList(idx); result.push(<div key={idx} className="h-1" />); return; }
    flushList(idx);
    result.push(<p key={idx} className="leading-relaxed">{inlineMarkdown(line)}</p>);
  });

  flushList("end");
  return result;
}

function inlineMarkdown(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  );
}

/* ─────────────────────────────────────────────
   Componente principal
   ✅ Nuevas props: onCitedDocument, onSearchResults
   ───────────────────────────────────────────── */
export default function ChatArea({ activeAgent, onCitedDocument, onSearchResults }) {
  const [messages, setMessages] = useState([initialMessage(activeAgent)]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const scrollRef               = useRef(null);
  const persona = AGENT_PERSONAS[activeAgent] || Object.values(AGENT_PERSONAS)[0];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    setMessages([initialMessage(activeAgent)]);
    setError(null);
    // ✅ Limpia el panel derecho al cambiar de agente
    onCitedDocument?.(null);
    onSearchResults?.([]);
  }, [activeAgent]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setError(null);

    const userMsg = {
      id: Date.now(),
      role: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const conversationHistory = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.text }));

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: persona.id,
          messages: [...conversationHistory, { role: "user", content: userText }],
          use_rag: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error ${response.status}`);
      }

      const data = await response.json();

      // ✅ Sube los datos del RAG al estado global en App.jsx
      onCitedDocument?.(data.cited_document || null);
      onSearchResults?.(data.search_results || []);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: data.reply,
          // Guardamos el filename para mostrarlo en la burbuja
          citedDoc: data.cited_document?.filename || null,
          ragUsed: data.rag_used,
          timestamp: new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setError(err.message || "Error al conectar con el backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden rounded-xl
      bg-light-surface dark:bg-umsa-surface
      border border-light-border dark:border-umsa-border
      transition-colors duration-300">

      {/* ══ HEADER ══ */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3
        bg-light-card dark:bg-umsa-card
        border-b border-light-border dark:border-umsa-border">
        <div className={`w-8 h-8 rounded-lg bg-light-bg dark:bg-umsa-bg flex items-center justify-center ${persona.color}`}>
          <Bot size={16} />
        </div>
        <div>
          <h1 className="text-light-text dark:text-umsa-text font-display font-semibold text-sm">{activeAgent}</h1>
          <p className="text-umsa-green text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-umsa-green inline-block" />
            En línea
          </p>
        </div>
      </div>

      {/* Banner de error */}
      {error && (
        <div className="shrink-0 mx-4 mt-3 flex items-start gap-2
          bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700/40
          rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Error del backend: </span>{error}
            <span className="ml-1 text-red-400/70 dark:text-red-500/70">
              — ¿Está corriendo uvicorn en el puerto 8000?
            </span>
          </div>
        </div>
      )}

      {/* ══ MENSAJES ══ */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ overscrollBehavior: "contain" }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isUser
                    ? "bg-light-card dark:bg-umsa-card text-light-muted dark:text-umsa-muted"
                    : `bg-light-bg dark:bg-umsa-bg ${persona.color}`
                }`}>
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Burbuja */}
                <div className={`flex flex-col gap-1.5 min-w-0 ${isUser ? "items-end" : "items-start"}`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm break-words ${
                    isUser
                      ? "bg-umsa-green text-white rounded-tr-sm"
                      : `${persona.bgColor} border ${persona.borderColor} text-light-text dark:text-umsa-text rounded-tl-sm`
                  }`}>
                    {!isUser && (
                      <p className={`text-xs font-semibold mb-1.5 ${persona.color}`}>{activeAgent}</p>
                    )}
                    {isUser
                      ? <p className="whitespace-pre-wrap">{msg.text}</p>
                      : <div className="space-y-0.5">{renderMarkdown(msg.text)}</div>
                    }
                  </div>

                  {/* Documento citado en la burbuja */}
                  {msg.citedDoc && (
                    <div className="flex items-center gap-2 border border-dashed border-umsa-green/50
                      rounded-xl px-3 py-2 bg-light-bg dark:bg-umsa-bg text-xs flex-wrap">
                      <FileText size={13} className="text-umsa-green shrink-0" />
                      <span className="text-light-muted dark:text-umsa-muted">Fuente:</span>
                      <span className="text-light-text dark:text-umsa-text font-semibold truncate max-w-[180px]">
                        {msg.citedDoc}
                      </span>
                      {/* ✅ Badge RAG */}
                      {msg.ragUsed && (
                        <span className="px-1.5 py-0.5 rounded-full bg-umsa-green/15 text-umsa-green text-[10px] font-semibold">
                          RAG
                        </span>
                      )}
                      <button className="ml-auto flex items-center gap-1 px-2 py-0.5
                        bg-umsa-green/20 text-umsa-green rounded-md hover:bg-umsa-green/30 transition-colors shrink-0">
                        <Eye size={11} /> Ver
                      </button>
                    </div>
                  )}

                  <span className="text-light-muted dark:text-umsa-muted text-xs px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Indicador de carga */}
        {loading && (
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
              bg-light-bg dark:bg-umsa-bg ${persona.color}`}>
              <Bot size={14} />
            </div>
            <div className={`${persona.bgColor} border ${persona.borderColor}
              rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2`}>
              <Loader2 size={14} className={`${persona.color} animate-spin`} />
              <span className="text-light-muted dark:text-umsa-muted text-sm">Procesando consulta...</span>
            </div>
          </div>
        )}
      </div>

      {/* ══ INPUT ══ */}
      <div className="shrink-0 px-4 py-3
        border-t border-light-border dark:border-umsa-border
        bg-light-card dark:bg-umsa-card">
        <div className="flex items-center gap-2
          bg-light-bg dark:bg-umsa-bg
          border border-light-border dark:border-umsa-border
          rounded-xl px-3 py-2
          focus-within:border-umsa-green transition-colors">
          <button className="text-light-muted dark:text-umsa-muted hover:text-light-text dark:hover:text-umsa-text transition-colors p-1 shrink-0">
            <Paperclip size={16} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            rows={1}
            className="flex-1 bg-transparent text-light-text dark:text-umsa-text text-sm
              placeholder-light-muted dark:placeholder-umsa-muted outline-none resize-none leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-umsa-green flex items-center justify-center shrink-0
              hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
        <p className="text-light-muted dark:text-umsa-muted text-xs mt-1.5 px-1">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}