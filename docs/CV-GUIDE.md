# Second Brain — portfolio and interview guide

## Project description

A MERN blogging and personal knowledge platform with authenticated real-time messaging and a Python retrieval service. It evolves the original Blog-page MVC structure into public story pages, a private knowledge workspace, and source-grounded AI conversations.

## Resume bullets

- Built a MERN platform with JWT cookie authentication, protected React routes, Markdown blog publishing, private drafts, comments, and optimistic concurrency for editing.
- Implemented authenticated Socket.IO messaging with typing indicators, MongoDB history, room authorization, message acknowledgments, and duplicate-message protection.
- Implemented a RAG pipeline using GPT-4o-mini and ChromaDB, embedding knowledge documents and incoming queries with text-embedding-3-large; combined semantic and keyword retrieval and displayed source citations.
- Added integration and browser tests covering account isolation, private/public content boundaries, upload validation, failed indexing recovery, publishing, and real-time chat.

These describe implemented behavior. Do not add invented user counts, accuracy improvements, latency figures, or deployment claims. Real OpenAI calls require a configured API key and billing; the automated suites mock OpenAI. Add evaluated quality or performance numbers only after measuring them on a documented dataset.

## A five-minute demonstration

1. **Stories:** show the public feed and an article. Explain that old posts and new drafts stay private until publication.
2. **Writing:** create a draft, preview Markdown, choose a cover, publish, then edit it. Open a second account to add a comment.
3. **Live messaging:** use two browser profiles. Search for the other person, send a message, show typing, and refresh to demonstrate persisted history.
4. **Knowledge:** add a short note with a fact you can verify. Show indexing status, ask a supported question, and open the citation. Ask a follow-up. Use real AI only when configured; label the browser sample honestly.
5. **Engineering:** open the architecture document and explain the trust boundaries, tests, and one scaling tradeoff.

## Talking points

**Why keep a Python service in a MERN project?** React, Express, Node, and MongoDB form the application. Python isolates document extraction, retrieval, vector persistence and model calls behind an authenticated internal HTTP boundary.

**How are private documents separated?** Express derives the owner from a verified JWT and Mongo user record. All Mongo queries include ownership. FastAPI uses a per-user Chroma collection; the browser cannot submit a trusted owner identity.

**Why embed both documents and questions with the same model?** The vectors must occupy the same embedding space for meaningful similarity ranking.

**What does hybrid retrieval add?** Semantic similarity finds related meanings; keyword matches help with precise names and code terms. Reciprocal rank fusion combines their rankings. It is not a trained reranker.

**How does chat avoid unauthorized delivery?** The server authenticates the socket, checks room participation on events, persists messages before acknowledging them, and deduplicates stable client IDs. Logout revokes sessions and disconnects sockets.

**What happens when two tabs edit a story?** The client submits the loaded version. A mismatch returns HTTP 409, and Mongoose also guards concurrent saves. The interface preserves local changes so the author can copy them before reloading.

**What would you improve for scale?** Move indexing to a durable worker queue; add distributed locks, shared rate limits and a Socket.IO adapter; use object storage; replace corpus scans with indexed keyword search; evaluate retrieval on a fixed question/source dataset.

## Verified scope and limits

The project includes registration/login, story publishing, comments, knowledge uploads/notes/projects, three retrieval modes, RAG conversations and real-time messaging. It does not implement OCR, background agents, a knowledge graph, email verification, password reset, or external Drive/GitHub connectors. Docker configuration is provided, but deployment and paid OpenAI behavior need environment-specific validation.

## Useful project evidence

- `tests/integration.test.js`: real temporary MongoDB, HTTP API and Socket.IO authorization checks.
- `tests/browser/`: production-build browser journeys using two real accounts, plus desktop/mobile sample workflows.
- `rag_service/test_rag.py`: real temporary Chroma with mocked embeddings and answers.
- `docs/*-desktop.png` and `docs/*-mobile.png`: screenshots of the implemented app.
- `README.md`, `docs/API.md`, `docs/ARCHITECTURE.md`: reproducible setup and engineering documentation.
