# 🎓 FCPN Multi-Agent Chat

Sistema de chat multi-agente para la **Facultad de Ciencias Puras y Naturales (FCPN)** de la UMSA.
Integra frontend moderno, backend con FastAPI y capacidades de RAG (búsqueda de documentos).

---

## 📁 Estructura del Proyecto

```
fcpn-chat/
│
├── frontend/              # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── AgentsPanel.jsx
│   │       ├── ChatArea.jsx
│   │       └── ResourcesPanel.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── backend/               # FastAPI (Python)
│   ├── main.py            # API principal
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Frontend (React)

### Requisitos

* Node.js ≥ 18
* npm ≥ 9

### Instalación

```bash
cd frontend
npm install
npm run dev
```

📍 Disponible en: http://localhost:5173

---

### Build de Producción

```bash
npm run build
npm run preview
```

---

## 🖥️ Backend (FastAPI)

### Requisitos

* Python ≥ 3.11
* pip

### Instalación

```bash
cd backend
pip install -r requirements.txt
```

---

## 🔐 Variables de Entorno

Crea un archivo `.env` dentro de `backend/`:

```env
# OpenAI / Azure (si usas RAG)
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=

# Azure Search
AZURE_SEARCH_ENDPOINT=
AZURE_SEARCH_INDEX=
AZURE_SEARCH_KEY=

# (Opcional) Anthropic
ANTHROPIC_API_KEY=
```

---

## ▶️ Ejecución del Backend

```bash
uvicorn main:app --reload --port 8000
```

---

## 📡 Documentación API

| Interfaz   | URL                         |
| ---------- | --------------------------- |
| Swagger UI | http://localhost:8000/docs  |
| ReDoc      | http://localhost:8000/redoc |

---

## 🔗 Endpoints Principales

```
GET    /agents
GET    /agents/{id}
POST   /chat
GET    /search
GET    /resources
GET    /resources/{id}
```

---

## 💬 Ejemplo de Uso

```bash
curl -X POST http://localhost:8000/chat \
-H "Content-Type: application/json" \
-d '{
  "agent_id": "cata",
  "messages": [
    { "role": "user", "content": "¿Cuándo es la inducción?" }
  ]
}'
```

---

## 🧠 Funcionalidades

* 🤖 Multi-agentes especializados
* 🔍 Búsqueda semántica (RAG)
* 📄 Visualización de documentos citados
* 💬 Chat con contexto conversacional
* 🎨 UI estilo ChatGPT (responsive)

---

## 🤖 Agentes Disponibles

| ID         | Nombre                 | Descripción              |
| ---------- | ---------------------- | ------------------------ |
| `kardex`     | Asistente General FCPN | Consultas académicas     |
| `info`     | Trámites Académicos    | Procesos administrativos |


---

## 🎨 Paleta UMSA

| Token        | Color   |
| ------------ | ------- |
| umsa-bg      | #0f1621 |
| umsa-surface | #161e2d |
| umsa-card    | #1c2639 |
| umsa-border  | #243044 |
| umsa-green   | #22c55e |
| umsa-text    | #e2e8f0 |
| umsa-muted   | #64748b |

---

## ⚠️ Notas Importantes

* No subas `.env` al repositorio.
* En producción, **NO expongas API Keys en el frontend**.
* Usa el backend como proxy para llamadas a modelos.

---

## 🚀 Futuras Mejoras

* Vector Search híbrido (keyword + embeddings)
* Ranking de documentos
* Streaming de respuestas
* Autenticación de usuarios
* Dashboard de analítica

---

## 🧑‍💻 Autor

Proyecto desarrollado para la FCPN — UMSA
