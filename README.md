# Second Brain — your knowledge, connected

A full-stack evolution of **RTXCSS/Blog-page**, keeping the original Express / models / routes / middleware / services structure and adding a React workspace plus a separate Python RAG service.

![Second Brain stories](docs/stories-desktop.png)

## What works

- **Accounts:** registration, login, JWT in HttpOnly cookies, bcrypt password hashing, session revocation on logout, and protected APIs.
- **Knowledge:** upload text PDFs, Markdown, text and code; write notes; organize by project and tags; inspect indexing status, retry failures, download originals, and delete sources.
- **RAG chat:** GPT-4o-mini answers grounded in ChromaDB retrieval. Documents **and queries** use OpenAI **text-embedding-3-large**. Answers include source cards with PDF pages or text/code line ranges. Conversations persist, including follow-up context.
- **Search:** semantic, keyword, and hybrid retrieval with reciprocal rank fusion.
- **Live chat:** private user-to-user Socket.IO conversations, authenticated connections, typing indicators, persisted history, reconnection, message acknowledgments and deduplication.
- **Stories:** public feed with search, topics and pagination; full article pages; private drafts; Markdown writing and preview; cover themes; publish/unpublish; editing conflict protection; comments and author moderation; copy a story into your private knowledge library.
- **Pages:** `/login`, `/signup`, `/blogs`, `/blogs/:id`, `/write`, `/blogs/:id/edit`, `/my-blogs`, `/workspace`, `/workspace/:conversationId`, `/knowledge`, `/projects`, `/search`, `/messages`, `/messages/:roomId`, and `/settings`. Refreshable URLs and protected-route redirects.
- **Interface:** responsive cream/sage theme, locally bundled DM Sans and Lora fonts, Markdown answers, keyboard-friendly dialogs, mobile navigation, copy-answer actions and honest empty/error states.
- **Sample workspace:** explicit browser-only preview with sample notes and extractive replies. It does not impersonate a live AI service or live users.

## Quick start on Windows

Requires Node.js 22+, npm, and Python 3.12 or 3.13. First-time package/Mongo downloads require internet access. An OpenAI API key with API billing is required for real indexing and generated answers. A ChatGPT subscription alone is not an API key.

From the repository root:

```powershell
npm install
npm install --prefix Frontend
npm run env:setup
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r rag_service/requirements.txt
```

Open the local `.env` file and set **OPENAI_API_KEY**. The setup command creates fresh JWT and service secrets and does not overwrite an existing configuration. Keep this file private; never put the key in React code or commit it.

Start the Python service in one terminal:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir rag_service --host 127.0.0.1 --port 8001
```

Start the app in another:

```powershell
npm run dev:local
```

Open **http://127.0.0.1:5173** and choose **Get started** to create an account. This command starts a real local MongoDB process through `mongodb-memory-server`; despite the package name, this development launcher uses WiredTiger and persists data in `storage/dev-mongo`. Its first run downloads a MongoDB binary. It is a development convenience, not a production database setup.

If you already have MongoDB or Atlas, set `MONGO_URL` in `.env` and use `npm run dev` instead. Use the original database name to see your existing blog entries and users. Back up an existing database before migration; old password hashes upgrade when users sign in.

To explore without accounts or API calls, choose **Explore the sample workspace**, or open **http://127.0.0.1:5173/?demo=true**. Sample data stays in this browser; leave sample mode before signing in to your real account.

## Try the complete flow

1. Register and create a project.
2. Add a note or upload a PDF with selectable text. Wait for **Ready to explore**. If indexing fails, open the document, read the reason and retry after fixing the service/key.
3. Ask a question supported by that document. Open a source card to verify the cited passage.
4. Ask a follow-up and revisit it from the conversation sidebar.
5. Open another browser profile, register a second user, then find them under **Messages** to test live chat and typing indicators.
6. Write a story at `/write`. Save a private draft, preview the Markdown, then explicitly publish it. The second user can find it on `/blogs` and leave a response.
7. Edit or unpublish it from **My stories**. Use **Add to knowledge** to index a private copy; subsequent story edits do not change this snapshot automatically.

The AI service reports configuration readiness, not a successful paid API call. Invalid keys, exhausted quota, or network failures appear when indexing/answering and leave recoverable UI states. Uploaded content and relevant questions are sent to the OpenAI API when using real AI features.

## Docker alternative

After generating `.env` and setting the key:

```powershell
docker compose up --build
```

Open **http://localhost:8000**. Compose persists MongoDB, uploads and ChromaDB in named volumes. Only the web app is published, bound to localhost. The file uses development cookie settings for local HTTP. For public hosting, configure HTTPS, `NODE_ENV=production`, explicit `CLIENT_ORIGIN`, authenticated MongoDB and infrastructure described in `docs/ARCHITECTURE.md`.

## Build and verify

```powershell
npm run build
npm test
.\.venv\Scripts\python.exe -m pytest rag_service -q
npm run lint --prefix Frontend
# Build first. Microsoft Edge must be installed; tests start an isolated app/database:
npm run test:ui
```

The Node suite uses an isolated temporary MongoDB and a fake RAG HTTP service. The Python suite uses real temporary Chroma collections and mocked OpenAI embeddings/completions. No test makes a paid OpenAI call. Browser tests verify desktop/mobile sample workflows and real two-account registration, private drafts, publication, comments, editing, and persisted Socket.IO conversations. The test server uses port 18107 and a temporary MongoDB; it never uses your development database. Live OpenAI output quality and Docker execution need separate environment-specific verification.

## Folder map

```text
Frontend/src/        React workspace, views, theme, API client and explicit sample mode
app.js               Express composition and startup
models/              Mongo users, original blogs, documents, projects, chats
routes/              Auth, knowledge, search, RAG, public stories and chat APIs
middleware/          JWT authorization
services/            Tokens, private ingestion, RAG HTTP client and Socket.IO
rag_service/         FastAPI, PDF/text processing, ChromaDB, OpenAI, Python tests
scripts/             Safe environment setup and persistent local Mongo launcher
storage/             Private runtime data; ignored by Git
views/               Original EJS templates, retained as unmounted reference
tests/              Node integration and Playwright browser tests
```

## Design artifacts

- [Editable Figma workspace concept](https://www.figma.com/design/dvFzHwHz1lTRTIKzdxY6RH?node-id=3-25) — native text, theme variables, and reusable navigation, prompt and source components.
- [Canva visual theme board](https://canva.link/iq92pwegjvu823c).
- `docs/workspace-desktop.png` and `docs/workspace-mobile.png` — screenshots of the working React app.
- `docs/CV-GUIDE.md` — resume bullets, a demonstration script, and interview talking points.
- `docs/API.md` — endpoint and Socket.IO event reference.
- `docs/ARCHITECTURE.md` — data flow, privacy boundaries, deployment assumptions and roadmap.

The supplied concept's knowledge graph, automatic memories, GitHub/Drive connectors, agents, MCP, OCR and voice are future extensions. This implementation delivers the account, knowledge, RAG, search, publishing and realtime-chat core first.

## Drafts and publication

Existing blog posts stay private until their author explicitly publishes them. Public endpoints return published stories and author display names, never account email addresses. Only authors may edit posts; comments may be removed by their writer or the story author. React escapes text and Markdown does not enable raw HTML.

Unsaved writing is recovered within the same browser tab using sessionStorage, keyed by account and story. Logging out clears recovery records. The **Save draft** action stores the draft in MongoDB; publishing is a separate explicit action. The editor sends a version number to detect changes saved by another tab.
