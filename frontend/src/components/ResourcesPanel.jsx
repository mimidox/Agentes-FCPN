import { useState, useEffect } from "react";
import {
  FileText, Eye, Download,
  ChevronLeft, ChevronRight, ChevronDown, FileType, Database,
} from "lucide-react";

// Archivos estáticos siempre disponibles para descarga
const primaryFiles = [
  { name: "Guia_de_Inscripciones_2024.pdf",   type: "pdf",  url: "/static/docs/Guia_de_Inscripciones_2024.pdf" },
  { name: "Formulario_001_Inscripcion.docx",   type: "docx", url: "/static/docs/Formulario_001_Inscripcion.docx" },
  { name: "Calendario_Académico.pdf",          type: "pdf",  url: "/static/docs/Calendario_Academico.pdf" },
];

const moreFiles = [
  { name: "Reglamento_Academico.pdf",          url: "/static/docs/Reglamento_Academico.pdf" },
  { name: "Malla_Curricular_Informatica.pdf",  url: "/static/docs/Malla_Curricular_Informatica.pdf" },
  { name: "Instructivo_SSA_2024.pdf",          url: "/static/docs/Instructivo_SSA_2024.pdf" },
  { name: "Formulario_Cambio_Carrera.pdf",     url: "/static/docs/Formulario_Cambio_Carrera.pdf" },
  { name: "Guia_Tesis_FCPN.pdf",              url: "/static/docs/Guia_Tesis_FCPN.pdf" },
];

// Estado vacío cuando no hay respuesta del agente aún
const EMPTY_STATE = {
  title:   "Esperando consulta...",
  content: "Haz una pregunta al agente para ver aquí el documento recuperado del índice RAG.",
  score:   null,
  source:  null,
  type:    null,
};

export default function ResourcesPanel({ citedDocument = null, searchResults = [] }) {
  const [page, setPage]               = useState(0);
  const [moreOpen, setMoreOpen]       = useState(false);
  const [selectedMore, setSelectedMore] = useState(null);

  // ✅ Reset de página cuando llegan nuevos resultados del RAG
  useEffect(() => {
    setPage(0);
  }, [citedDocument, searchResults]);

  // ✅ Construye la lista de docs a mostrar desde los datos reales del RAG
  // citedDocument va primero (es el más relevante), luego los demás search_results
  const ragDocs = [
    ...(citedDocument ? [{
      title:   citedDocument.filename,
      content: citedDocument.relevance_reason,
      type:    citedDocument.document_type,
      score:   null,
      source:  null,
      isCited: true,
    }] : []),
    ...searchResults
      .filter((r) => !citedDocument || r.title !== citedDocument.filename)
      .map((r) => ({
        title:   r.title,
        content: r.content,
        type:    "docx",
        score:   r.score,
        source:  r.source,
        isCited: false,
      })),
  ];

  const hasRagData = ragDocs.length > 0;
  const currentDoc = hasRagData ? ragDocs[Math.min(page, ragDocs.length - 1)] : null;

  return (
    <aside className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">

      {/* ══ DOCUMENTO CITADO / RAG VIEWER ══ */}
      <div className="bg-light-surface dark:bg-umsa-surface border border-light-border dark:border-umsa-border rounded-xl overflow-hidden transition-colors duration-300">

        {/* Header */}
        <div className="px-4 py-3 border-b border-light-border dark:border-umsa-border flex items-center justify-between">
          <h2 className="text-light-text dark:text-umsa-text font-display font-semibold text-xs tracking-wide uppercase">
            Documento Citado
          </h2>
          <div className="flex items-center gap-1.5">
            {hasRagData && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-umsa-green/15 text-umsa-green font-semibold">
                <Database size={9} /> RAG
              </span>
            )}
          </div>
        </div>

        {/* ── Doc Card ── */}
        <div className="mx-4 my-3 bg-light-card dark:bg-umsa-card border border-light-border dark:border-umsa-border rounded-lg overflow-hidden">

          {/* Preview visual */}
          <div className="h-36 bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center p-3">
            {hasRagData && currentDoc ? (
              <div className="w-full h-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded flex flex-col items-center justify-center gap-1.5 px-3">
                {/* Ícono según tipo */}
                <div className={`w-8 h-8 rounded flex items-center justify-center ${
                  currentDoc.type === "pdf" ? "bg-red-500/80" : "bg-blue-500/80"
                }`}>
                  <FileType size={16} className="text-white" />
                </div>

                {/* Título del doc */}
                <p className="text-slate-700 dark:text-white/80 text-xs font-semibold text-center leading-tight line-clamp-2">
                  {currentDoc.title}
                </p>

                {/* Badge cited / score */}
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {currentDoc.isCited && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-umsa-green/20 text-umsa-green font-bold">
                      ★ Citado
                    </span>
                  )}
                  {currentDoc.score && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
                      score: {currentDoc.score}
                    </span>
                  )}
                </div>

                {/* Líneas decorativas tipo PDF */}
                <div className="mt-1 w-full space-y-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full bg-black/15 dark:bg-white/20 ${
                      ["w-full", "w-4/5", "w-3/5", "w-2/3"][i]
                    }`} />
                  ))}
                </div>
              </div>
            ) : (
              /* Estado vacío */
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/5 flex items-center justify-center">
                  <Database size={18} className="text-light-muted dark:text-umsa-muted opacity-40" />
                </div>
                <p className="text-light-muted dark:text-umsa-muted text-xs opacity-60">
                  Sin documento recuperado
                </p>
              </div>
            )}
          </div>

          {/* Paginación entre documentos RAG */}
          {hasRagData && ragDocs.length > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-light-border dark:border-umsa-border">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-7 h-7 rounded-md bg-light-bg dark:bg-umsa-bg border border-light-border dark:border-umsa-border
                  flex items-center justify-center text-light-muted dark:text-umsa-muted
                  hover:text-light-text dark:hover:text-umsa-text disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-light-muted dark:text-umsa-muted text-xs">
                Doc {page + 1} de {ragDocs.length}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(ragDocs.length - 1, p + 1))}
                disabled={page === ragDocs.length - 1}
                className="w-7 h-7 rounded-md bg-light-bg dark:bg-umsa-bg border border-light-border dark:border-umsa-border
                  flex items-center justify-center text-light-muted dark:text-umsa-muted
                  hover:text-light-text dark:hover:text-umsa-text disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── Fragmento de texto recuperado ── */}
        <div className="px-4 pb-4">
          {hasRagData && currentDoc ? (
            <>
              <p className="text-light-muted dark:text-umsa-muted text-xs font-semibold uppercase mb-1.5">
                Fragmento recuperado:
              </p>
              <p className="text-light-text dark:text-umsa-text text-xs leading-relaxed line-clamp-6">
                {currentDoc.content}
              </p>
              {/* Fuente (parent_id decodificado parcialmente) */}
              {currentDoc.source && (
                <p className="text-light-muted dark:text-umsa-muted text-[10px] mt-2 truncate" title={currentDoc.source}>
                  Fuente: {currentDoc.source.split("/").pop() || currentDoc.source}
                </p>
              )}
            </>
          ) : (
            <p className="text-light-muted dark:text-umsa-muted text-xs opacity-60">
              {EMPTY_STATE.content}
            </p>
          )}
        </div>
      </div>

      {/* ══ ARCHIVOS PARA DESCARGAR ══ */}
      <div className="bg-light-surface dark:bg-umsa-surface border border-light-border dark:border-umsa-border rounded-xl overflow-hidden transition-colors duration-300">
        <div className="px-4 py-3 border-b border-light-border dark:border-umsa-border">
          <h2 className="text-light-text dark:text-umsa-text font-display font-semibold text-xs tracking-wide uppercase">
            Archivos para Descargar
          </h2>
        </div>
        <ul className="divide-y divide-light-border dark:divide-umsa-border">
          {primaryFiles.map(({ name, type, url }) => (
            <li key={name} className="flex items-center gap-2 px-3 py-2.5">
              <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                type === "pdf" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
              }`}>
                <FileText size={13} />
              </div>
              <span className="flex-1 text-light-text dark:text-umsa-text text-xs truncate" title={name}>
                {name}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 bg-light-bg dark:bg-umsa-bg border border-light-border dark:border-umsa-border
                  rounded-md text-light-muted dark:text-umsa-muted hover:text-umsa-green hover:border-umsa-green transition-colors text-xs shrink-0"
                title="Ver"
              >
                <Eye size={11} /> Ver
              </a>
              <a
                href={url}
                download
                className="flex items-center gap-1 px-2 py-1 bg-umsa-green/10 border border-umsa-green/30
                  rounded-md text-umsa-green hover:bg-umsa-green/20 transition-colors text-xs shrink-0"
                title="Descargar"
              >
                <Download size={11} />
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* ══ MÁS ARCHIVOS ══ */}
      <div className="bg-light-surface dark:bg-umsa-surface border border-light-border dark:border-umsa-border rounded-xl overflow-hidden transition-colors duration-300">
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-light-hover dark:hover:bg-umsa-hover transition-colors"
        >
          <span className="text-light-text dark:text-umsa-text font-display font-semibold text-xs tracking-wide uppercase">
            Más Archivos
          </span>
          <ChevronDown
            size={14}
            className={`text-light-muted dark:text-umsa-muted transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
          />
        </button>
        {moreOpen && (
          <ul className="border-t border-light-border dark:border-umsa-border divide-y divide-light-border dark:divide-umsa-border">
            {moreFiles.map(({ name, url }) => (
              <li key={name}>
                <button
                  onClick={() => setSelectedMore(selectedMore === name ? null : name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-light-hover dark:hover:bg-umsa-hover transition-colors ${
                    selectedMore === name ? "bg-light-hover dark:bg-umsa-hover" : ""
                  }`}
                >
                  <FileText size={13} className="text-red-400 shrink-0" />
                  <span className="text-light-text dark:text-umsa-text text-xs truncate">{name}</span>
                  {selectedMore === name && (
                    <div className="ml-auto flex gap-1 shrink-0">
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="p-1 text-umsa-green hover:text-emerald-400">
                        <Eye size={12} />
                      </a>
                      <a href={url} download
                        className="p-1 text-umsa-green hover:text-emerald-400">
                        <Download size={12} />
                      </a>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}