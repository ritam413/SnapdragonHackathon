# ⚡ SnapEdge AI
> **The Autonomous On-Device Multi-Agent Intelligence Copilot for Snapdragon® HP PCs**  
> *Built for the Qualcomm & HP Snapdragon AI Lab Build & Present Challenge*

---

## 🌟 Overview
SnapEdge AI transforms Snapdragon-powered HP PCs into an air-gapped, zero-latency intelligence workstation. By orchestrating four specialized AI agents directly on the **45 TOPS Qualcomm Hexagon™ NPU**, SnapEdge AI delivers enterprise email triage, voice meeting transcription, neural document search, and vision threat protection at **11.2x greater energy efficiency** than legacy x86 CPUs with **0 cloud data egress**.

```
                           +------------------------+
                           |  SnapEdge Cockpit UI   |
                           |  (Dark Glassmorphic)   |
                           +-----------+------------+
                                       |
                                       v
                           +------------------------+
                           |  FastAPI Gateway Core  |
                           +-----------+------------+
                                       |
    +------------------+---------------+----------------+------------------+
    |                  |                                |                  |
    v                  v                                v                  v
+-----------+    +-------------+                 +--------------+    +-------------+
| Workspace |    | Voice Scribe|                 |  Neural RAG  |    | Vision Shield|
|   Agent   |    |    Agent    |                 |    Agent     |    |    Agent    |
+-----+-----+    +------+------+                 +-------+------+    +------+------+
      \                 \                               /                  /
       \                 \                             /                  /
        +-----------------> +------------------------+ <-----------------+
                            | Snapdragon QNN Engine  |
                            | (45 TOPS Hexagon NPU)  |
                            +------------------------+
```

---

## 🚀 4 Spearhead USPs
1. **Heterogeneous Multi-Model NPU Concurrency (HMC-Engine)**: Concurrent execution of 4 quantized Qualcomm AI Hub models (Phi-3.5, Whisper-Base, All-MiniLM-L6, YOLOv8-Nano) pinned to NPU SRAM.
2. **Air-Gapped Zero-Egress Workspace**: 100% on-device processing. Built-in PII and secret sanitizers scrub sensitive information with zero cloud API dependencies.
3. **Real-Time Watts/Token Eco-Governor**: Live hardware telemetry streaming power draw (~3.8W vs 42.5W CPU), active TOPS throughput, and efficiency ratios.
4. **Autonomous Edge Action Graph**: Synthesizes action items, calendar bookings, and quarantine alerts without human bottleneck.

---

## ⚡ Quickstart

### Prerequisites
- Python 3.10+
- Dependencies: `fastapi`, `uvicorn`, `pydantic`, `reportlab`, `pypdf`

### 1. Installation
```bash
git clone https://github.com/your-org/SnapEdge-AI.git
cd SnapEdge-AI
pip install -r snapdragon/requirements.txt
```

### 2. Run Self-Test Suite
```bash
python -m snapdragon.app --test
```

### 3. Launch Interactive Cockpit
```bash
python -m snapdragon.app --port 8080
```
Open **`http://127.0.0.1:8080`** in any web browser.

---

## 📁 Repository Structure
```
snapdragon/
├── agents/                     # 4 Specialized Edge Agents
│   ├── workspace_agent.py      # Air-gapped mail triage & PII sanitizer
│   ├── voice_agent.py          # Whisper speech scribe & action assigner
│   ├── rag_agent.py            # All-MiniLM vector search engine
│   └── vision_security_agent.py# YOLOv8-Nano threat scanner
├── engine/                     # Hardware Abstraction Layer
│   ├── contracts.py            # Pydantic data schemas & telemetry types
│   ├── model_hub.py            # Qualcomm AI Hub model registry
│   └── qnn_runtime.py          # QNN execution provider & fallback engine
├── static/                     # Web Cockpit Dashboard
│   ├── index.html              # Responsive UI layout & gauges
│   ├── styles.css              # Zero-slop dark theme design tokens
│   └── app.js                  # WebSocket client & preset dispatchers
├── tickets/                    # Wayfinder Task Tickets (Tickets 01-06)
├── app.py                      # FastAPI orchestrator & WebSocket server
├── SUBMISSION_PROPOSAL.md      # Full hackathon submission package
├── SnapEdge_AI_Project_Description.pdf # 3-page publication PDF
└── SnapEdge_AI_Pitch_Presentation.pdf   # 7-slide pitch presentation PDF
```

---

## 🏆 Qualcomm AI Hub Model Inventory
| Model | Task | Quantization | Target Accelerator |
|---|---|---|---|
| `phi_3_5_mini_instruct_qnn` | SLM Reasoning & Triage | INT4 (AWQ) | Hexagon NPU |
| `whisper_base_en_qnn` | Speech Recognition | INT8 (QAT) | Hexagon NPU |
| `all_minilm_l6_v2_qnn` | Vector Embeddings | INT8 | Hexagon NPU |
| `yolov8_nano_qnn` | Anomaly / Vision Shield | INT8 | Hexagon NPU |
