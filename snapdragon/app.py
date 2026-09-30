"""
SnapEdge AI — FastAPI Orchestrator & Live Telemetry Server
Optimized for Snapdragon-Powered HP PCs (45 TOPS Hexagon NPU)
"""

import asyncio
import os
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from snapdragon.engine.contracts import (
    HardwareTelemetry,
    WorkspaceTriageRequest,
    WorkspaceTriageResponse,
    VoiceTranscribeRequest,
    VoiceTranscribeResponse,
    DocumentRAGRequest,
    DocumentRAGResponse,
    VisionScanRequest,
    VisionScanResponse
)
from snapdragon.engine.qnn_runtime import engine
from snapdragon.engine.model_hub import list_registered_models
from snapdragon.agents.workspace_agent import WorkspaceAgent
from snapdragon.agents.voice_agent import VoiceAgent
from snapdragon.agents.rag_agent import RAGAgent
from snapdragon.agents.vision_security_agent import VisionSecurityAgent

# Initialize FastAPI application
app = FastAPI(
    title="SnapEdge AI — Snapdragon Copilot Engine",
    description="Autonomous on-device edge intelligence optimized for Snapdragon-powered HP PCs.",
    version="1.0.0"
)

# CORS Middleware for local webviews and cross-origin tools
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Agent Singletons
workspace_agent = WorkspaceAgent()
voice_agent = VoiceAgent()
rag_agent = RAGAgent()
vision_agent = VisionSecurityAgent()

# Static assets directory guard
CURRENT_DIR = Path(__file__).resolve().parent
STATIC_DIR = CURRENT_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return HTMLResponse(content=index_path.read_text(encoding="utf-8"))
    return HTMLResponse(
        """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SnapEdge AI — Edge Gateway</title>
  <style>
    body { background: #0b0f19; color: #e2e8f0; font-family: system-ui, sans-serif; padding: 48px; text-align: center; }
    h1 { color: #38bdf8; font-size: 2rem; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 1rem; line-height: 1.6; }
    .badge { display: inline-block; background: #1e293b; color: #38bdf8; padding: 6px 14px; border-radius: 4px; font-family: monospace; font-size: 0.9rem; margin-top: 16px; border: 1px solid #334155; }
    a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <h1>⚡ SnapEdge AI Server Active</h1>
  <p>Qualcomm Hexagon 45 TOPS NPU Orchestrator & Multi-Agent Pipeline Running.</p>
  <div class="badge">Endpoints live at <a href="/docs">/docs</a> &bull; WebSocket: /ws/telemetry</div>
</body>
</html>"""
    )


@app.get("/api/telemetry", response_model=HardwareTelemetry)
async def get_telemetry():
    return engine.get_telemetry()


@app.get("/api/models")
async def get_models():
    return {
        "device": "HP OmniBook Ultra (Snapdragon® X Elite)",
        "npu_peak_tops": 45.0,
        "models": list_registered_models()
    }


@app.post("/api/agents/workspace", response_model=WorkspaceTriageResponse)
async def run_workspace_agent(request: WorkspaceTriageRequest):
    return workspace_agent.process(request)


@app.post("/api/agents/voice", response_model=VoiceTranscribeResponse)
async def run_voice_agent(request: VoiceTranscribeRequest):
    return voice_agent.transcribe_and_summarize(request)


@app.post("/api/agents/rag", response_model=DocumentRAGResponse)
async def run_rag_agent(request: DocumentRAGRequest):
    return rag_agent.query(request)


@app.post("/api/agents/vision", response_model=VisionScanResponse)
async def run_vision_agent(request: VisionScanRequest):
    return vision_agent.scan(request)


@app.websocket("/ws/telemetry")
async def websocket_telemetry_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            telemetry = engine.get_telemetry().model_dump()
            await websocket.send_json(telemetry)
            await asyncio.sleep(0.6)  # Stream at ~1.6 Hz
    except (WebSocketDisconnect, ConnectionResetError, asyncio.CancelledError):
        pass
    except Exception:
        pass


def run_self_tests():
    from fastapi.testclient import TestClient
    client = TestClient(app)

    # 1. Telemetry endpoint
    t_res = client.get("/api/telemetry")
    assert t_res.status_code == 200, f"Telemetry failed: {t_res.status_code}"
    assert "npu_power_watts" in t_res.json(), "Missing telemetry keys"

    # 2. Models endpoint
    m_res = client.get("/api/models")
    assert m_res.status_code == 200, f"Models failed: {m_res.status_code}"
    assert len(m_res.json()["models"]) >= 4, "Missing registered models"

    # 3. Workspace Agent
    w_res = client.post(
        "/api/agents/workspace",
        json={"content": "URGENT: Review Snapdragon submission sk-12345678901234567890", "sender": "lead@hp.com", "subject": "Review"}
    )
    assert w_res.status_code == 200, f"Workspace agent failed: {w_res.status_code}"
    w_data = w_res.json()
    assert w_data["pii_redacted"] is True, "PII redaction flag failed"
    assert "[REDACTED_SECRET_KEY]" in w_data["sanitized_preview"], "PII redaction text failed"

    # 4. Voice Agent
    v_res = client.post("/api/agents/voice", json={"audio_sample_id": "sample_audio", "meeting_context": "Sprint sync"})
    assert v_res.status_code == 200, f"Voice agent failed: {v_res.status_code}"
    v_data = v_res.json()
    assert len(v_data["assigned_tasks"]) > 0, "Voice task extraction failed"
    assert len(v_data["key_decisions"]) > 0, "Voice decision extraction failed"

    # 5. RAG Agent
    r_res = client.post("/api/agents/rag", json={"query": "What is the NPU TOPS rating?", "top_k": 2})
    assert r_res.status_code == 200, f"RAG agent failed: {r_res.status_code}"
    r_data = r_res.json()
    assert len(r_data["citations"]) > 0, "RAG citations failed"

    # 6. Vision Agent
    vis_res = client.post("/api/agents/vision", json={"sample_type": "phishing_email", "image_name": "screen.png"})
    assert vis_res.status_code == 200, f"Vision agent failed: {vis_res.status_code}"
    vis_data = vis_res.json()
    assert "threat_level" in vis_data, "Vision threat_level failed"

    # 7. Fallback Root HTML
    root_res = client.get("/")
    assert root_res.status_code == 200, f"Root route failed: {root_res.status_code}"

    print("[SUCCESS] All SnapEdge AI FastAPI Gateway tests passed successfully.")


if __name__ == "__main__":
    import argparse
    import uvicorn

    parser = argparse.ArgumentParser(description="SnapEdge AI Gateway")
    parser.add_argument("--host", default=os.getenv("HOST", "127.0.0.1"), help="Host address")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8080")), help="Port number")
    parser.add_argument("--test", action="store_true", help="Run self-tests")
    args = parser.parse_args()

    if args.test:
        run_self_tests()
    else:
        print(f"Starting SnapEdge AI Server on http://{args.host}:{args.port} ...")
        uvicorn.run("snapdragon.app:app", host=args.host, port=args.port, reload=False)
