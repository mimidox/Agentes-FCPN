"""
FCPN Multi-Agent Chat API v3
============================
Motor : GPT-4o mini · Azure AI Foundry
RAG   : Azure AI Search (índice rag-1777354953412)
Auth  : API Key

Ejecutar:
    uvicorn main:app --reload --port 8000

Docs:
    http://localhost:8000/docs
    http://localhost:8000/redoc
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Env
# ---------------------------------------------------------------------------

load_dotenv()

AZURE_OPENAI_ENDPOINT:    str = os.getenv("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
AZURE_OPENAI_API_KEY:     str = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_DEPLOYMENT:  str = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

AZURE_SEARCH_ENDPOINT:    str = os.getenv("AZURE_SEARCH_ENDPOINT", "").rstrip("/")
AZURE_SEARCH_QUERY_KEY:   str = os.getenv("AZURE_SEARCH_QUERY_KEY", "")
AZURE_SEARCH_INDEX:       str = os.getenv("AZURE_SEARCH_INDEX", "")

PORT:         int       = int(os.getenv("PORT", 8000))
CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

AZURE_CHAT_URL = (
    f"{AZURE_OPENAI_ENDPOINT}/openai/deployments/"
    f"{AZURE_OPENAI_DEPLOYMENT}/chat/completions"
    f"?api-version={AZURE_OPENAI_API_VERSION}"
)

if not AZURE_OPENAI_ENDPOINT:
    raise RuntimeError("❌  AZURE_OPENAI_ENDPOINT no configurado en .env")
if not AZURE_OPENAI_API_KEY:
    raise RuntimeError("❌  AZURE_OPENAI_API_KEY no configurado en .env")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FCPN Multi-Agent Chat API",
    description="""
## Sistema de Chat Multi-Agente – FCPN/UMSA

**Motor:** GPT-4o mini · Azure AI Foundry  
**RAG:** Azure AI Search → índice `rag-1777354953412`

### Agentes
| ID | Nombre | Especialidad |
|----|--------|-------------|
| `kardex` | Agente Kardex | Historial académico, notas, créditos |
| `informacion` | Agente Información | Carreras, trámites, calendario |
    """,
    version="3.0.0",
    contact={"name": "División de Sistemas – FCPN", "email": "sistemas@fcpn.umsa.bo"},
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class AgentID(str, Enum):
    KARDEX      = "kardex"
    INFORMACION = "informacion"

class ResourceType(str, Enum):
    PDF   = "pdf"
    DOCX  = "docx"
    IMAGE = "image"

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class AgentStatus(BaseModel):
    online:    bool     = True
    last_seen: datetime = Field(default_factory=datetime.utcnow)

class Agent(BaseModel):
    id:            AgentID
    name:          str
    description:   str
    system_prompt: str
    status:        AgentStatus = Field(default_factory=AgentStatus)

class AgentListResponse(BaseModel):
    agents: list[Agent]
    total:  int

class ChatMessage(BaseModel):
    role:    str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)

class ChatRequest(BaseModel):
    agent_id:   AgentID
    messages:   list[ChatMessage] = Field(..., min_length=1)
    session_id: Optional[str]     = None
    use_rag:    bool               = Field(True, description="Activar búsqueda en Azure AI Search")

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "agent_id": "kardex",
                "messages": [{"role": "user", "content": "¿Cuántas materias aprobé?"}],
                "session_id": "sess_abc123",
                "use_rag": True,
            }]
        }
    }

class SearchDocument(BaseModel):
    """Fragmento de documento recuperado por Azure AI Search."""
    title:   str
    content: str
    source:  Optional[str]  = None
    score:   Optional[float] = None

class CitedDocument(BaseModel):
    filename:         str
    document_type:    ResourceType
    relevance_reason: str
    preview_url:      Optional[str] = None

class ChatResponse(BaseModel):
    session_id:     str
    agent_id:       AgentID
    reply:          str
    cited_document: Optional[CitedDocument]  = None
    search_results: list[SearchDocument]     = Field(default_factory=list)
    model:          str
    rag_used:       bool     = False
    created_at:     datetime = Field(default_factory=datetime.utcnow)

class Resource(BaseModel):
    id:            str
    filename:      str
    document_type: ResourceType
    size_kb:       int
    download_url:  str
    preview_url:   Optional[str] = None
    category:      str
    description:   Optional[str] = None

class ResourceListResponse(BaseModel):
    resources: list[Resource]
    total:     int

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

AGENTS: list[Agent] = [
    Agent(
        id=AgentID.KARDEX,
        name="Agente Kardex",
        description="Historial académico, notas, materias y estado académico del estudiante.",
        system_prompt=(
            """Eres el Agente Kardex de la FCPN (UMSA). Ayudas a estudiantes con información académica.

Tienes acceso a fragmentos de documentos institucionales (RAG). Estos fragmentos SIEMPRE son tu fuente principal cuando estén presentes.

REGLAS:

1. USO DE DOCUMENTOS (OBLIGATORIO)
- Si hay contenido en el contexto, DEBES usarlo para responder.
- Resume, organiza y explica la información encontrada.
- No ignores el contexto.

2. SI FALTA INFORMACIÓN
- Si el documento no tiene TODO el dato, responde con lo que sí existe.
- Puedes decir: "No se encontró el detalle exacto, pero según los documentos..."

3. NO ALUCINAR
- No inventes datos específicos que no estén en el contexto.
- No inventes horarios, aulas o docentes.

4. CONTEXTO DE CONVERSACIÓN
- Usa mensajes anteriores.
- Si el usuario dice "de horarios" o algo corto, interpreta el contexto previo.

5. ESTILO
- Respuestas claras, directas y útiles.
- Usa listas si hay muchos datos.
- Evita respuestas genéricas como "consulta con la dirección".

6. PROHIBIDO
- No digas "no tengo información suficiente" si hay contexto disponible.
- No ignores los documentos recuperados.

OBJETIVO:
Responder SIEMPRE usando la información disponible en los documentos cuando exista, y complementar solo si es necesario."""
        ),
    ),
    Agent(
        id=AgentID.INFORMACION,
        name="Agente Información",
        description="Información general: carreras, trámites, calendario e inscripciones.",
        system_prompt=(
            "Eres el Agente de Información de la FCPN (Facultad de Ciencias Puras y Naturales) "
            "de la UMSA (Universidad Mayor de San Andrés) en La Paz, Bolivia. "
            "Proporcionas información sobre carreras, inscripciones, trámites administrativos, "
            "calendario académico, contactos y eventos institucionales. "
            "Usa los documentos del contexto cuando estén disponibles. "
            "Sé amable, claro y conciso. Responde siempre en español."
        ),
    ),
]

RESOURCES: list[Resource] = [
    Resource(
        id="res_001", filename="Guia_de_Inscripciones_2024.pdf",
        document_type=ResourceType.PDF, size_kb=342,
        download_url="/static/docs/Guia_de_Inscripciones_2024.pdf",
        preview_url="/static/previews/guia_inscripciones.jpg",
        category="Inscripciones",
        description="Guía completa de requisitos y pasos para la pre-inscripción 2024.",
    ),
    Resource(
        id="res_002", filename="Formulario_001_Inscripcion.docx",
        document_type=ResourceType.DOCX, size_kb=48,
        download_url="/static/docs/Formulario_001_Inscripcion.docx",
        category="Inscripciones",
        description="Formulario oficial de inscripción – debe entregarse llenado.",
    ),
    Resource(
        id="res_003", filename="Calendario_Académico.pdf",
        document_type=ResourceType.PDF, size_kb=210,
        download_url="/static/docs/Calendario_Academico.pdf",
        preview_url="/static/previews/calendario.jpg",
        category="Calendario",
        description="Fechas oficiales del año académico 2024: inicio, exámenes y cierre.",
    ),
    Resource(
        id="res_004", filename="Reglamento_Academico.pdf",
        document_type=ResourceType.PDF, size_kb=890,
        download_url="/static/docs/Reglamento_Academico.pdf",
        category="Reglamentos",
        description="Reglamento académico vigente de la FCPN.",
    ),
    Resource(
        id="res_005", filename="Malla_Curricular_Informatica.pdf",
        document_type=ResourceType.PDF, size_kb=156,
        download_url="/static/docs/Malla_Curricular_Informatica.pdf",
        category="Curricular",
        description="Malla curricular completa de la carrera de Informática.",
    ),
]

KEYWORD_DOC_MAP: dict[str, str] = {
    "inscripci": "res_001",
    "formulario": "res_002",
    "calendario": "res_003",
    "reglamento": "res_004",
    "malla":      "res_005",
    "curricular": "res_005",
}

RESOURCE_INDEX: dict[str, Resource]  = {r.id: r for r in RESOURCES}
AGENT_INDEX:    dict[AgentID, Agent] = {a.id: a for a in AGENTS}

# ---------------------------------------------------------------------------
# Azure AI Search — RAG
# ---------------------------------------------------------------------------

# Campos reales confirmados del índice: chunk_id, parent_id, chunk, title, text_vector
_SEARCH_SELECT = "chunk_id,parent_id,chunk,title"
_SEARCH_API_VERSION = "2023-11-01"


async def _call_search(client: httpx.AsyncClient, payload: dict) -> dict | None:
    """
    Ejecuta la llamada a Azure AI Search.
    Retorna el JSON de respuesta o None si falla.
    """
    base_url = f"{AZURE_SEARCH_ENDPOINT}/indexes/{AZURE_SEARCH_INDEX}/docs/search"
    headers  = {
        "Content-Type": "application/json",
        "api-key": AZURE_SEARCH_QUERY_KEY,
    }
    try:
        resp = await client.post(
            base_url,
            params={"api-version": _SEARCH_API_VERSION},
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        print(f"❌ Azure Search HTTP {exc.response.status_code}: {exc.response.text}")
        return None
    except httpx.RequestError as exc:
        print(f"❌ Azure Search conexión fallida: {exc}")
        return None


def _parse_search_results(data: dict) -> list[SearchDocument]:
    """Convierte el JSON de Azure Search en lista de SearchDocument."""
    results: list[SearchDocument] = []
    for item in data.get("value", []):
        title_val   = item.get("title") or "Documento"
        source_val  = item.get("parent_id") or item.get("chunk_id") or ""
        content_val = (item.get("chunk") or "").strip()

        # Fallback a captions si el chunk vino vacío
        if not content_val:
            captions    = item.get("@search.captions") or []
            content_val = captions[0].get("text", "").strip() if captions else ""

        if not content_val:
            print(f"⚠️  Sin contenido extraíble: {title_val} | keys: {list(item.keys())}")
            continue

        # rerankerScore es más preciso en modo semántico; fallback a search.score
        score = item.get("@search.rerankerScore") or item.get("@search.score")

        results.append(SearchDocument(
            title=title_val,
            content=content_val[:1200],
            source=source_val,
            score=round(float(score), 4) if score else None,
        ))
    return results


async def search_documents(query: str, top: int = 5) -> list[SearchDocument]:
    """
    Busca en Azure AI Search.
    - Salta directamente a búsqueda simple (la semántica no está configurada).
    - Usa searchMode "any" para que baste con que aparezca al menos una palabra.
    - Si la query tiene más de 4 palabras, también lanza una búsqueda exacta
      con la frase completa y combina los resultados.
    """
    if not AZURE_SEARCH_ENDPOINT or not AZURE_SEARCH_QUERY_KEY or not AZURE_SEARCH_INDEX:
        print("⚠️  RAG desactivado: faltan variables AZURE_SEARCH_* en .env")
        return []

    url     = f"{AZURE_SEARCH_ENDPOINT}/indexes/{AZURE_SEARCH_INDEX}/docs/search"
    headers = {
        "Content-Type": "application/json",
        "api-key": AZURE_SEARCH_QUERY_KEY,
    }

    payload_any = {
        "search":     query,
        "top":        top,
        "select":     _SEARCH_SELECT,
        "queryType":  "simple",
        "searchMode": "any",
    }

    results: list[SearchDocument] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        data = await _call_search(client, payload_any)

        if data:
            results = _parse_search_results(data)

        if len(results) < 2:
            keywords = " ".join(
                w for w in query.split()
                if len(w) > 3
            )
            if keywords and keywords != query:
                payload_kw = {
                    "search":     keywords,
                    "top":        top,
                    "select":     _SEARCH_SELECT,
                    "queryType":  "simple",
                    "searchMode": "any",
                }
                data_kw = await _call_search(client, payload_kw)
                if data_kw:
                    extra = _parse_search_results(data_kw)
                    existing = {r.source for r in results}
                    for doc in extra:
                        if doc.source not in existing:
                            results.append(doc)
                            existing.add(doc.source)

    print(f"🔍 RAG '{query[:60]}' → {len(results)} fragmentos recuperados")
    return results[:top]


def build_rag_context(docs: list[SearchDocument]) -> str:
    """Formatea los fragmentos recuperados como contexto para el LLM."""
    if not docs:
        return ""
    parts = ["=== DOCUMENTOS INSTITUCIONALES (usa SOLO esta información) ===\n"]
    for i, doc in enumerate(docs, 1):
        score_str  = f" | relevancia: {doc.score}" if doc.score else ""
        source_str = f"\n   Fuente: {doc.source}" if doc.source else ""
        parts.append(
            f"[Doc {i}] {doc.title}{score_str}{source_str}\n"
            f"{doc.content}\n"
            f"{'─' * 50}"
        )
    parts.append("\n=== FIN DE DOCUMENTOS ===")
    return "\n".join(parts)


def detect_cited_doc(
    text: str,
    search_results: list[SearchDocument] | None = None,
) -> Optional[CitedDocument]:
    """
    Detecta el documento citado.
    Prioridad: doc más relevante del RAG → keyword-matching en la respuesta del LLM.
    """
    # 1. Usar el doc más relevante del Search
    if search_results:
        top_doc   = search_results[0]
        score_str = f" (score: {top_doc.score})" if top_doc.score else ""
        return CitedDocument(
            filename=top_doc.title or "Documento institucional",
            document_type=ResourceType.DOCX,
            relevance_reason=f"Recuperado del índice RAG{score_str}",
            preview_url=None,
        )

    # 2. Fallback: keyword-matching en la respuesta del LLM
    lower = text.lower()
    for keyword, res_id in KEYWORD_DOC_MAP.items():
        if keyword in lower:
            res = RESOURCE_INDEX.get(res_id)
            if res:
                return CitedDocument(
                    filename=res.filename,
                    document_type=res.document_type,
                    relevance_reason=f"Contenido relacionado con '{keyword}'.",
                    preview_url=res.preview_url,
                )
    return None


def build_payload(
    system_prompt: str,
    messages: list[ChatMessage],
    rag_context: str,
) -> dict:
    """
    Construye el payload para Azure OpenAI Chat Completions.
    Inyecta el contexto RAG dentro del system prompt.
    """
    system_content = system_prompt
    if rag_context:
        system_content += f"\n\n{rag_context}"

    openai_messages: list[dict] = [{"role": "system", "content": system_content}]
    openai_messages += [{"role": m.role, "content": m.content} for m in messages]

    return {
        "messages": openai_messages,
        "max_tokens": 1024,
        "temperature": 0.7,
        "top_p": 0.95,
        "stream": False,
    }

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", summary="Health check", tags=["Sistema"])
async def root():
    return {
        "status": "ok",
        "api": "FCPN Multi-Agent Chat API",
        "version": "3.0.0",
        "provider": "Azure AI Foundry",
        "deployment": AZURE_OPENAI_DEPLOYMENT,
        "search_index": AZURE_SEARCH_INDEX or "no configurado",
        "rag_enabled": bool(AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_QUERY_KEY and AZURE_SEARCH_INDEX),
    }


@app.get(
    "/agents",
    response_model=AgentListResponse,
    summary="Listar agentes",
    description="Retorna los agentes disponibles: kardex e informacion.",
    tags=["Agentes"],
)
async def get_agents() -> AgentListResponse:
    return AgentListResponse(agents=AGENTS, total=len(AGENTS))


@app.get(
    "/agents/{agent_id}",
    response_model=Agent,
    summary="Detalle de un agente",
    tags=["Agentes"],
    responses={404: {"description": "Agente no encontrado"}},
)
async def get_agent(agent_id: AgentID) -> Agent:
    agent = AGENT_INDEX.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no encontrado.")
    return agent


@app.post(
    "/chat",
    response_model=ChatResponse,
    summary="Enviar mensaje (GPT-4o mini + RAG)",
    description=(
        "Envía un mensaje a un agente. Si `use_rag=true` (por defecto), primero busca "
        "en Azure AI Search para enriquecer la respuesta con documentos institucionales.\n\n"
        "**Flujo:**\n"
        "1. Búsqueda semántica en índice `rag-1777354953412` (con fallback simple)\n"
        "2. Fragmentos relevantes → contexto del system prompt\n"
        "3. GPT-4o mini genera la respuesta fundamentada\n"
        "4. Se detecta y adjunta el documento citado"
    ),
    tags=["Chat"],
    responses={
        400: {"description": "Agente inválido"},
        503: {"description": "Azure AI no disponible"},
    },
)
async def post_chat(body: ChatRequest) -> ChatResponse:
    agent = AGENT_INDEX.get(body.agent_id)
    if not agent:
        raise HTTPException(status_code=400, detail="Agente inválido. Usa: kardex, informacion.")

    session_id = body.session_id or f"sess_{uuid.uuid4().hex[:10]}"

    # 1. RAG — busca SIEMPRE si use_rag=True
    search_results: list[SearchDocument] = []
    rag_used = False

    if body.use_rag:
        # Combina los últimos 2 mensajes del usuario para mejor contexto de búsqueda
        user_msgs    = [m.content for m in body.messages if m.role == "user"]
        search_query = " ".join(user_msgs[-2:])

        print(f"🔎 Buscando en RAG: '{search_query[:80]}'")
        search_results = await search_documents(search_query, top=5)
        rag_used       = len(search_results) > 0

        if not rag_used:
            print("⚠️  RAG no devolvió resultados — el modelo responderá sin contexto documental")

    rag_context = build_rag_context(search_results)

    # 2. Construir payload y llamar a Azure OpenAI
    payload = build_payload(agent.system_prompt, body.messages, rag_context)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                AZURE_CHAT_URL,
                headers={
                    "Content-Type": "application/json",
                    "api-key": AZURE_OPENAI_API_KEY,
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Error Azure AI Foundry: HTTP {exc.response.status_code}. "
                "Verifica AZURE_OPENAI_API_KEY, ENDPOINT y DEPLOYMENT en el .env"
            ),
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo conectar a Azure AI Foundry: {exc}",
        ) from exc

    reply_text: str = data["choices"][0]["message"]["content"]
    cited = detect_cited_doc(reply_text, search_results=search_results if rag_used else None)

    return ChatResponse(
        session_id=session_id,
        agent_id=body.agent_id,
        reply=reply_text,
        cited_document=cited,
        search_results=search_results,
        model=data.get("model", AZURE_OPENAI_DEPLOYMENT),
        rag_used=rag_used,
    )


@app.get(
    "/resources",
    response_model=ResourceListResponse,
    summary="Listar recursos",
    description="Retorna documentos institucionales. Filtra por `category` si se provee.",
    tags=["Recursos"],
)
async def get_resources(category: Optional[str] = None) -> ResourceListResponse:
    resources = RESOURCES
    if category:
        resources = [r for r in resources if r.category.lower() == category.lower()]
    return ResourceListResponse(resources=resources, total=len(resources))


@app.get(
    "/resources/{resource_id}",
    response_model=Resource,
    summary="Detalle de un recurso",
    tags=["Recursos"],
    responses={404: {"description": "Recurso no encontrado"}},
)
async def get_resource(resource_id: str) -> Resource:
    res = RESOURCE_INDEX.get(resource_id)
    if not res:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")
    return res


@app.get(
    "/search",
    summary="Búsqueda directa en el índice",
    description="Consulta directa al índice de Azure AI Search. Útil para debug.",
    tags=["Búsqueda"],
)
async def search(q: str, top: int = 5) -> dict[str, Any]:
    results = await search_documents(q, top=top)
    return {
        "query": q,
        "results": [r.model_dump() for r in results],
        "total": len(results),
    }


# ---------------------------------------------------------------------------
# Debug endpoints — úsalos para diagnosticar el RAG
# ---------------------------------------------------------------------------

@app.get("/debug/config", tags=["Debug"])
async def debug_config():
    """Verifica qué variables de entorno están cargadas."""
    return {
        "AZURE_OPENAI_ENDPOINT":    AZURE_OPENAI_ENDPOINT or "❌ VACÍO",
        "AZURE_OPENAI_DEPLOYMENT":  AZURE_OPENAI_DEPLOYMENT or "❌ VACÍO",
        "AZURE_OPENAI_API_KEY_set": bool(AZURE_OPENAI_API_KEY),
        "AZURE_SEARCH_ENDPOINT":    AZURE_SEARCH_ENDPOINT or "❌ VACÍO",
        "AZURE_SEARCH_INDEX":       AZURE_SEARCH_INDEX or "❌ VACÍO",
        "AZURE_SEARCH_KEY_set":     bool(AZURE_SEARCH_QUERY_KEY),
        "rag_ready": bool(AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_QUERY_KEY and AZURE_SEARCH_INDEX),
    }


@app.get("/debug/fields", tags=["Debug"])
async def debug_fields():
    """
    Inspecciona los campos reales del índice y trae un documento de muestra.
    Llama esto primero para confirmar qué campos existen.
    """
    if not AZURE_SEARCH_ENDPOINT or not AZURE_SEARCH_QUERY_KEY or not AZURE_SEARCH_INDEX:
        return {"error": "Variables AZURE_SEARCH_* no configuradas — revisa /debug/config"}

    headers = {
        "Content-Type": "application/json",
        "api-key": AZURE_SEARCH_QUERY_KEY,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        # Definición del índice (nombres de campos)
        idx_url  = f"{AZURE_SEARCH_ENDPOINT}/indexes/{AZURE_SEARCH_INDEX}"
        idx_resp = await client.get(
            idx_url,
            params={"api-version": _SEARCH_API_VERSION},
            headers=headers,
        )
        index_fields = []
        if idx_resp.status_code == 200:
            index_fields = [
                {"name": f["name"], "type": f["type"]}
                for f in idx_resp.json().get("fields", [])
            ]

        # Un documento de muestra sin filtro de select (trae todo)
        sample_url  = f"{AZURE_SEARCH_ENDPOINT}/indexes/{AZURE_SEARCH_INDEX}/docs/search"
        sample_resp = await client.post(
            sample_url,
            params={"api-version": _SEARCH_API_VERSION},
            headers=headers,
            json={"search": "*", "top": 1},
        )
        sample_keys = []
        sample_preview = {}
        if sample_resp.status_code == 200:
            docs = sample_resp.json().get("value", [])
            if docs:
                sample_keys    = list(docs[0].keys())
                # Muestra los primeros 300 chars de cada campo de texto
                sample_preview = {
                    k: str(v)[:300] if isinstance(v, str) else type(v).__name__
                    for k, v in docs[0].items()
                    if not k.startswith("@")
                }

    return {
        "index_fields":   index_fields,
        "sample_keys":    sample_keys,
        "sample_preview": sample_preview,
    }


@app.get("/debug/raw-search", tags=["Debug"])
async def debug_raw_search(q: str = "horarios"):
    """
    Llama directamente a Azure Search con la query dada y devuelve
    la respuesta cruda. Prueba ambos modos: semántico y simple.
    Úsalo para diagnosticar por qué /search retorna vacío.
    """
    if not AZURE_SEARCH_ENDPOINT or not AZURE_SEARCH_QUERY_KEY or not AZURE_SEARCH_INDEX:
        return {"error": "Variables AZURE_SEARCH_* no configuradas — revisa /debug/config"}

    url     = f"{AZURE_SEARCH_ENDPOINT}/indexes/{AZURE_SEARCH_INDEX}/docs/search"
    headers = {
        "Content-Type": "application/json",
        "api-key": AZURE_SEARCH_QUERY_KEY,
    }

    payload_semantic = {
        "search": q,
        "top": 3,
        "select": _SEARCH_SELECT,
        "queryType": "semantic",
        "semanticConfiguration": "default",
        "captions": "extractive",
        "searchMode": "all",
    }

    payload_simple = {
        "search": q,
        "top": 3,
        "select": _SEARCH_SELECT,
        "queryType": "simple",
        "searchMode": "all",
    }

    # Sin select — para ver TODOS los campos crudos
    payload_no_select = {
        "search": q,
        "top": 1,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        r_semantic   = await client.post(url, params={"api-version": _SEARCH_API_VERSION}, headers=headers, json=payload_semantic)
        r_simple     = await client.post(url, params={"api-version": _SEARCH_API_VERSION}, headers=headers, json=payload_simple)
        r_no_select  = await client.post(url, params={"api-version": _SEARCH_API_VERSION}, headers=headers, json=payload_no_select)

    def safe_json(r: httpx.Response) -> dict:
        try:
            return r.json()
        except Exception:
            return {"raw_text": r.text}

    return {
        "query": q,
        "semantic": {
            "status":       r_semantic.status_code,
            "count":        len(safe_json(r_semantic).get("value", [])),
            "response":     safe_json(r_semantic),
        },
        "simple": {
            "status":       r_simple.status_code,
            "count":        len(safe_json(r_simple).get("value", [])),
            "response":     safe_json(r_simple),
        },
        "no_select_raw": {
            "status":       r_no_select.status_code,
            "first_doc_keys": list(safe_json(r_no_select).get("value", [{}])[0].keys()) if safe_json(r_no_select).get("value") else [],
            "response":     safe_json(r_no_select),
        },
    }