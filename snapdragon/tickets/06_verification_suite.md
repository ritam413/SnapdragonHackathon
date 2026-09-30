# [TICKET-06] End-to-End Verification & Local Test Suite (HARDENED)

- **Type**: `wayfinder:task` (AFK)
- **Status**: Completed
- **Owner**: `ROLE: DEVELOPER`
- **Prerequisites**: `snapdragon/tickets/04_cockpit_ui.md`, `snapdragon/tickets/05_submission_proposal.md`

## Goal & Question
How do we verify and test all endpoints, agent behaviors, telemetry streaming, ReDoS boundaries, and file integrity to ensure zero runtime errors prior to submission?

## Scope & Target Deliverables
- `snapdragon/test_pipeline.py`: Automated test harness asserting:
  - Telemetry API returns valid TOPS and power numbers.
  - Workspace Agent redacts PII and extracts action items.
  - Voice Agent transcribes audio and extracts decisions.
  - RAG Agent vector-retrieves relevant knowledge chunks.
  - Vision Agent detects phishing threats and unmasked PII.
  - Stress testing with 64KB input payloads and malformed text.

## Adversarial Hardening & Acceptance Criteria
- [x] **100% Test Pass Rate**: Zero unhandled exceptions on all valid and edge-case test vectors.
- [x] **Sub-15ms Assertion**: Verifies on-device execution speed boundaries.
- [x] **ReDoS Stress Check**: Tests malicious regex payloads to prove non-blocking performance.
