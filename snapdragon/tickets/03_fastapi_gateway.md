# [TICKET-03] FastAPI Orchestrator & Live Telemetry Streamer (HARDENED)

- **Type**: `wayfinder:task` (AFK)
- **Status**: Completed
- **Owner**: `ROLE: DEVELOPER`
- **Prerequisites**: `snapdragon/tickets/01_qnn_engine.md`, `snapdragon/tickets/02_edge_agents.md`

## Goal & Question
How do we expose the Snapdragon acceleration layer and multi-agent pipeline through a lightweight REST and WebSocket API that resists zombie connection memory leaks, port collisions, and missing asset crashes?

## Scope & Target Deliverables
- `snapdragon/app.py`:
  - `GET /api/telemetry`: Hardware telemetry snapshot.
  - `GET /api/models`: Registered Qualcomm AI Hub model list.
  - `POST /api/agents/workspace`: Air-gapped mail/doc triage endpoint.
  - `POST /api/agents/voice`: Voice meeting scribe endpoint.
  - `POST /api/agents/rag`: Neural document RAG endpoint.
  - `POST /api/agents/vision`: Vision threat shield endpoint.
  - `WebSocket /ws/telemetry`: Real-time streaming metrics (1.6 Hz).
  - Robust static file mount & fallback handler.

## Adversarial Hardening & Acceptance Criteria
- [x] **WebSocket Zombie Cleanup**: Multi-exception handler catching `WebSocketDisconnect`, `ConnectionResetError`, and `asyncio.CancelledError`.
- [x] **Configurable Port Binding**: Honors `PORT` environment variable and CLI arguments with fallback.
- [x] **Missing Static Guard**: Returns clean fallback HTML if static directory is missing.
- [x] **CORS Wildcard Configuration**: Allows seamless integration from local webviews or cross-origin browsers.
