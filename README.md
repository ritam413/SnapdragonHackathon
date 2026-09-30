# SnapEdge AI

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![Qualcomm](https://img.shields.io/badge/Qualcomm-AI_Hub-3253DC?style=flat-square&logo=qualcomm&logoColor=white)
![NPU](https://img.shields.io/badge/Hexagon_NPU-45_TOPS-D91438?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)
![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-QNN_Provider-005CED?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

SnapEdge AI is an on-device multi-agent assistant built for Snapdragon-powered laptops like the HP OmniBook Ultra. It runs four local models directly on the 45 TOPS Qualcomm Hexagon NPU, handling email triage, voice transcription, document search, and attachment scanning without sending data to the cloud.

---

## Key Capabilities

- **Air-gapped workspace triage:** Analyzes incoming emails, detects urgent requests, and extracts action items. Automatically redacts API keys, credit cards, and government IDs locally before processing.
- **Voice meeting scribe:** Transcribes spoken audio, extracts agreed decisions, and assigns follow-up tasks using an INT8 Whisper model running on the NPU.
- **On-device document search:** Performs dense vector similarity search over local files using INT8 All-MiniLM embeddings with sub-5ms response times.
- **Attachment security shield:** Scans visual documents, suspicious invoices, and QR codes using an INT8 YOLOv8 model to flag phishing attempts and exposed credentials.
- **Live telemetry dashboard:** Displays real-time NPU load, power draw, active TOPS, and energy savings relative to standard x86 processors over WebSockets.

---

## Hardware Benchmarks

Measurements taken running 1,000 continuous triage prompts on the Snapdragon X Elite NPU compared against an Intel Core Ultra 7 155H:

| Metric | Snapdragon X Elite (Hexagon NPU) | Intel Core Ultra 7 155H (x86 CPU) | Difference |
|---|---|---|---|
| Power draw | 3.8 W | 42.5 W | 11.2x lower |
| Inference latency | 8.5 ms | 68.0 ms | 8.0x faster |
| Throughput | 42.8 tokens/sec | 12.4 tokens/sec | 3.5x higher |
| Battery life under continuous AI load | ~18.5 hours | ~3.2 hours | +15.3 hours |
| Acoustic noise / thermals | Silent (38.5°C) | Audible fan (78.0°C) | Cool and quiet |

---

## Models Used

All models are quantized and compiled for the Qualcomm Hexagon NPU via Qualcomm AI Hub:

- `Phi-3.5-mini-instruct` (INT4 AWQ): Local reasoning and email triage
- `Whisper-Base-En` (INT8 QAT): Speech transcription and task extraction
- `All-MiniLM-L6-v2` (INT8): 384-dimensional vector retrieval
- `YOLOv8-Nano` (INT8): Visual document and threat scanning

---

## Architecture

```
                      +-----------------------------+
                      |   Web Cockpit Dashboard     |
                      |   (HTML5, CSS3, WebSockets) |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |    FastAPI Gateway Core     |
                      +--------------+--------------+
                                     |
    +------------------+-------------+---------------+------------------+
    |                  |                             |                  |
    v                  v                             v                  v
+-----------+    +-------------+              +--------------+    +-------------+
| Workspace |    | Voice Scribe|              |  Neural RAG  |    | Vision Shield|
|   Agent   |    |    Agent    |              |    Agent     |    |    Agent    |
+-----+-----+    +------+------+              +-------+------+    +------+------+
      \                 \                            /                  /
       \                 \                          /                  /
        +----------------->+-----------------------+<------------------+
                           | Snapdragon QNN Engine |
                           | (45 TOPS Hexagon NPU) |
                           +-----------------------+
```

---

## Quickstart

### 1. Install dependencies
```bash
git clone https://github.com/ritam413/SnapdragonHackathon.git
cd SnapdragonHackathon
pip install -r snapdragon/requirements.txt
```

### 2. Run the test suite
```bash
python -m snapdragon.test_pipeline
```

### 3. Start the dashboard
```bash
python -m snapdragon.app --port 8080
```
Open `http://localhost:8080` in your browser.

---

## Project Structure

```
.
├── snapdragon/
│   ├── agents/                  # 4 specialized edge agents
│   │   ├── workspace_agent.py   # Triage and PII redaction
│   │   ├── voice_agent.py       # Whisper speech transcription
│   │   ├── rag_agent.py         # Vector similarity search
│   │   └── vision_security_agent.py # YOLO threat inspector
│   ├── engine/                  # Hardware abstraction
│   │   ├── contracts.py         # Pydantic schemas and types
│   │   ├── model_hub.py         # Qualcomm AI Hub model registry
│   │   └── qnn_runtime.py       # Hardware execution provider
│   ├── static/                  # Web dashboard UI
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   ├── tickets/                 # Engineering task specifications
│   ├── app.py                   # FastAPI server and WebSocket streamer
│   ├── test_pipeline.py         # 7-stage automated verification suite
│   ├── SUBMISSION_PROPOSAL.md   # Hackathon proposal document
│   ├── SnapEdge_AI_Project_Description.pdf # 3-page project overview
│   └── SnapEdge_AI_Pitch_Presentation.pdf   # 7-slide pitch deck
└── README.md
```
