# [TICKET-02] 4 Autonomous Edge Agents Pipeline (HARDENED)

- **Type**: `wayfinder:task` (AFK)
- **Status**: Blocked by `TICKET-01`
- **Owner**: `ROLE: DEVELOPER`
- **Prerequisites**: `snapdragon/tickets/01_qnn_engine.md`

## Goal & Question
How do we structure 4 independent autonomous agents realizing the 4 core USPs (Zero-Egress Workspace Triage, Voice Meeting Scribe, Neural Document RAG, and Vision Security Shield) running locally on Snapdragon NPU, while defending against ReDoS attacks and malformed input vectors?

## Scope & Target Deliverables
- `snapdragon/agents/workspace_agent.py`: Local PII redactor (API keys, cards, govt IDs) + opportunity/urgent triage + action extraction + local auto-reply with 64KB payload limit.
- `snapdragon/agents/voice_agent.py`: Speech-to-text transcriber (Whisper INT8 QNN) + meeting decision extractor + task assigner.
- `snapdragon/agents/rag_agent.py`: On-device vector retrieval (All-MiniLM-L6 QNN) + citation engine over confidential documents.
- `snapdragon/agents/vision_security_agent.py`: Vision scanner (YOLOv8-Nano QNN) detecting phishing overlays, QR code threats, and unmasked contract PII.

## Adversarial Hardening & Acceptance Criteria
- [x] **ReDoS Protection**: Pre-compiled regex patterns with bounded quantifiers to prevent CPU locking on hostile payloads.
- [x] **Payload Bounding**: Truncates or validates incoming strings > 64KB to avoid memory thrashing.
- [x] **Strict Type Contracts**: All agent outputs conform to Pydantic schemas in `contracts.py`.
- [x] **Air-Gap Verification**: No external HTTP requests are made during any agent execution cycle.
