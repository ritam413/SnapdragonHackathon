# [TICKET-04] Interactive Glassmorphic Web Dashboard UI (HARDENED)

- **Type**: `wayfinder:prototype` (AFK/HITL)
- **Status**: Completed
- **Owner**: `ROLE: DEVELOPER`
- **Prerequisites**: `snapdragon/tickets/03_fastapi_gateway.md`

## Goal & Question
How do we present the power of Snapdragon X Elite 45 TOPS NPU and all 4 Edge AI agents through a visual interface that is resilient against disconnects and works offline without third-party CDN dependencies?

## Scope & Target Deliverables
- `snapdragon/static/index.html`: Clean semantic DOM, gauge meters, and agent tabs.
- `snapdragon/static/styles.css`: Dark Snapdragon theme with electric cyan/neon accents, zero-slop UI tokens, and 60fps hardware accelerated transitions.
- `snapdragon/static/app.js`: Dynamic protocol & host resolution (`ws://` vs `wss://`), auto-reconnecting WebSocket, tab routing, and preset dispatchers.

## Adversarial Hardening & Acceptance Criteria
- [x] **Auto-Reconnecting WebSocket**: Automatically attempts reconnection if backend server restarts.
- [x] **Dynamic Host Resolution**: Uses `window.location.host` rather than hardcoded `localhost:8080`.
- [x] **Offline Self-Contained**: Uses native browser font stacks if Google Fonts fails to load offline.
- [x] **Zero DOM Exception**: Safe null-checking on all DOM element references before updating.
