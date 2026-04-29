import { useState, useEffect } from "react";
import AgentsPanel from "./components/AgentsPanel";
import ChatArea from "./components/ChatArea";
import ResourcesPanel from "./components/ResourcesPanel";
import { Menu, X } from "lucide-react";

export default function App() {
  const [darkMode, setDarkMode]       = useState(true);
  const [activeAgent, setActiveAgent] = useState("Agente Kardex");
  const [leftOpen, setLeftOpen]       = useState(false);
  const [rightOpen, setRightOpen]     = useState(false);

  // ✅ Estado RAG elevado — se pasa a ChatArea (setter) y ResourcesPanel (lectura)
  const [citedDocument, setCitedDocument]   = useState(null);
  const [searchResults, setSearchResults]   = useState([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const closeAll = () => { setLeftOpen(false); setRightOpen(false); };

  // ✅ Reset del RAG al cambiar de agente
  const handleSetActiveAgent = (agent) => {
    setActiveAgent(agent);
    setCitedDocument(null);
    setSearchResults([]);
    setLeftOpen(false);
  };

  return (
    <div
      className="flex flex-col bg-light-bg dark:bg-umsa-bg text-light-text dark:text-umsa-text font-body transition-colors duration-300"
      style={{ height: "100dvh", overflow: "hidden" }}
    >
      {/* ══ HEADER ══ */}
      <header
        className="shrink-0 flex items-center px-4 gap-3
          bg-light-surface dark:bg-umsa-surface
          border-b border-light-border dark:border-umsa-border
          transition-colors duration-300 z-30"
        style={{ height: "48px" }}
      >
        <button
          className="lg:hidden p-1.5 rounded-md text-light-muted dark:text-umsa-muted hover:text-umsa-green transition-colors"
          onClick={() => { setLeftOpen(o => !o); setRightOpen(false); }}
          aria-label="Abrir panel de agentes"
        >
          <Menu size={18} />
        </button>

        <div className="w-7 h-7 rounded bg-umsa-green flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">F</span>
        </div>
        <span className="font-display font-semibold text-xs tracking-widest uppercase text-light-text dark:text-umsa-text truncate">
          <span className="hidden sm:inline">FCPN · Facultad de Ciencias Puras y Naturales</span>
          <span className="sm:hidden">FCPN · UMSA</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-light-muted dark:text-umsa-muted text-xs hidden sm:block">UMSA</span>
          <div className="w-2 h-2 rounded-full bg-umsa-green animate-pulse" />
          <button
            className="lg:hidden p-1.5 rounded-md text-light-muted dark:text-umsa-muted hover:text-umsa-green transition-colors ml-1"
            onClick={() => { setRightOpen(o => !o); setLeftOpen(false); }}
            aria-label="Abrir panel de recursos"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* ══ CUERPO ══ */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Overlay móvil */}
        {(leftOpen || rightOpen) && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={closeAll} />
        )}

        {/* ── Panel Izquierdo ── */}
        <div className={`
          shrink-0 w-72
          lg:relative lg:translate-x-0 lg:overflow-y-auto lg:flex lg:flex-col lg:z-auto lg:p-4 lg:gap-4
          fixed top-12 bottom-0 left-0 z-30
          flex flex-col p-4 gap-4 overflow-y-auto
          transition-transform duration-300 ease-in-out
          bg-light-bg dark:bg-umsa-bg
          ${leftOpen ? "translate-x-0" : "-translate-x-full"}
          lg:!translate-x-0
        `}>
          <button
            className="lg:hidden self-end p-1.5 rounded-md text-light-muted dark:text-umsa-muted hover:text-umsa-green mb-1"
            onClick={() => setLeftOpen(false)}
          >
            <X size={16} />
          </button>
          <AgentsPanel
            activeAgent={activeAgent}
            setActiveAgent={handleSetActiveAgent}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        </div>

        {/* ── Chat (centro) ── */}
        <div className="flex-1 min-w-0 min-h-0 p-2 sm:p-4">
          <div className="relative w-full h-full">
            {/* ✅ Pasa los setters al ChatArea para que actualice el estado global */}
            <ChatArea
              activeAgent={activeAgent}
              onCitedDocument={setCitedDocument}
              onSearchResults={setSearchResults}
            />
          </div>
        </div>

        {/* ── Panel Derecho ── */}
        <div className={`
          shrink-0 w-72
          lg:relative lg:translate-x-0 lg:overflow-y-auto lg:flex lg:flex-col lg:z-auto lg:p-4 lg:gap-4
          fixed top-12 bottom-0 right-0 z-30
          flex flex-col p-4 gap-4 overflow-y-auto
          transition-transform duration-300 ease-in-out
          bg-light-bg dark:bg-umsa-bg
          ${rightOpen ? "translate-x-0" : "translate-x-full"}
          lg:!translate-x-0
        `}>
          <button
            className="lg:hidden self-start p-1.5 rounded-md text-light-muted dark:text-umsa-muted hover:text-umsa-green mb-1"
            onClick={() => setRightOpen(false)}
          >
            <X size={16} />
          </button>
          {/* ✅ ResourcesPanel ahora recibe los datos reales del RAG */}
          <ResourcesPanel
            citedDocument={citedDocument}
            searchResults={searchResults}
          />
        </div>
      </div>
    </div>
  );
}