# [TICKET-01] Snapdragon QNN Engine & Model Hub Runtime (HARDENED)

- **Type**: `wayfinder:task` (AFK)
- **Status**: Completed
- **Owner**: `ROLE: DEVELOPER`
- **Prerequisites**: None

## Goal & Question
How do we orchestrate multiple Qualcomm AI Hub quantized models (`Whisper-Base INT8`, `Phi-3.5-mini INT4`, `All-MiniLM-L6 INT8`, `YOLOv8-Nano INT8`) with fail-safe multi-tier fallback (`QNNExecutionProvider` -> `DmlExecutionProvider` -> `CPUExecutionProvider`) and expose real-time Hexagon 45 TOPS and power profiling without any crash risks on non-ARM evaluator hardware?

## Scope & Target Deliverables
- `snapdragon/engine/contracts.py`: Pydantic schemas for telemetry, action items, agent requests/responses.
- `snapdragon/engine/model_hub.py`: Model registry with precision, TOPS targets, latency, and power metrics.
- `snapdragon/engine/qnn_runtime.py`: `SnapdragonAIEngine` singleton managing execution providers and dynamic telemetry.

## Adversarial Hardening & Acceptance Criteria
- [x] **Zero-Crash Import Guard**: Gracefully handles missing `onnxruntime` or missing QNN DLLs on x86 evaluator machines.
- [x] **Realistic Telemetry Simulation**: Calculates active TOPS (0-45 TOPS), active wattage (~3.5W - 4.2W vs ~42.5W CPU), and power savings multiplier dynamically with subtle oscillation.
- [x] **Zero Cloud Socket Dependencies**: 100% on-device local execution.
- [x] **Thread-Safe Singleton**: Prevents race conditions during concurrent telemetry polling.
