"""
SnapEdge AI — End-to-End Automated Verification & Adversarial Stress Test Suite
Optimized for Snapdragon-Powered HP PCs (45 TOPS Hexagon NPU)
"""

import time
from fastapi.testclient import TestClient
from snapdragon.app import app
from snapdragon.engine.qnn_runtime import engine


def test_suite():
    client = TestClient(app)
    print("==================================================================")
    print(">> SNAPEDGE AI: RUNNING END-TO-END VERIFICATION & HARDENING SUITE")
    print("==================================================================")

    # -------------------------------------------------------------
    # 1. Hardware Telemetry & Model Hub Tests
    # -------------------------------------------------------------
    print("\n[TEST 1] Verifying Hardware Telemetry & Qualcomm AI Hub Registry...")
    t_res = client.get("/api/telemetry")
    assert t_res.status_code == 200, f"Telemetry endpoint failed: {t_res.status_code}"
    telemetry = t_res.json()
    assert telemetry["tops_current"] > 0, "Current TOPS must be > 0"
    assert telemetry["npu_power_watts"] < 5.0, "NPU power draw must be < 5.0W"
    assert telemetry["power_savings_multiplier"] >= 5.0, "Power savings ratio must be >= 5x"
    print(f"  --> Telemetry OK: {telemetry['tops_current']} TOPS @ {telemetry['npu_power_watts']}W ({telemetry['power_savings_multiplier']}x savings)")

    m_res = client.get("/api/models")
    assert m_res.status_code == 200, f"Models endpoint failed: {m_res.status_code}"
    models_data = m_res.json()
    assert len(models_data["models"]) == 4, f"Expected 4 models, got {len(models_data['models'])}"
    print(f"  --> Model Hub OK: {len(models_data['models'])} Qualcomm AI Hub models compiled & pinned")

    # -------------------------------------------------------------
    # 2. Workspace Agent Tests (USP 2: Air-Gapped Zero-Egress)
    # -------------------------------------------------------------
    print("\n[TEST 2] Testing Air-Gapped Workspace & PII Scrubbing Agent...")
    w_req = {
        "content": (
            "Subject: Urgent Qualcomm Hackathon Registration\n"
            "From: hr@hp.com\n"
            "Please register before 30 Sep 2026, 11:59 PM IST. "
            "Master Secret: sk-live11223344556677889900. "
            "Corp Card: 4532-1199-8833-2211. "
            "Govt ID: 123-45-6789."
        )
    }
    w_res = client.post("/api/agents/workspace", json=w_req)
    assert w_res.status_code == 200, f"Workspace triage failed: {w_res.status_code}"
    w_data = w_res.json()
    assert w_data["category"] == "Opportunity", f"Wrong category: {w_data['category']}"
    assert w_data["pii_redacted"] is True, "PII redaction flag should be True"
    assert "[REDACTED_SECRET_KEY]" in w_data["sanitized_preview"], "API key not redacted"
    assert "[REDACTED_CARD_NUMBER]" in w_data["sanitized_preview"], "Credit card not redacted"
    assert "[REDACTED_GOV_ID]" in w_data["sanitized_preview"], "Government ID not redacted"
    assert len(w_data["action_items"]) >= 2, "Action items extraction failed"
    print(f"  --> Workspace Agent OK: Category='{w_data['category']}', {len(w_data['action_items'])} Actions, PII Scrubbed 100%")

    # -------------------------------------------------------------
    # 3. Voice Scribe Agent Tests (USP 1: Whisper-Base INT8 QNN)
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Voice Meeting Scribe Agent (Whisper INT8 QNN)...")
    v_req = {
        "audio_text_simulated": "In the architecture sync, Alex decided to compile Phi-3.5 via Qualcomm AI Hub. John will complete benchmarking by 5 PM.",
        "meeting_context": "Executive Standup"
    }
    v_res = client.post("/api/agents/voice", json=v_req)
    assert v_res.status_code == 200, f"Voice scribe failed: {v_res.status_code}"
    v_data = v_res.json()
    assert len(v_data["key_decisions"]) > 0, "Failed to extract key decisions"
    assert len(v_data["assigned_tasks"]) > 0, "Failed to assign tasks"
    print(f"  --> Voice Scribe OK: {len(v_data['key_decisions'])} Decisions, {len(v_data['assigned_tasks'])} Tasks ({v_data['latency_ms']}ms)")

    # -------------------------------------------------------------
    # 4. Neural Document RAG Tests (USP 1: All-MiniLM-L6 INT8)
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Neural Document Vector RAG Agent...")
    r_req = {
        "query": "What is the NPU TOPS rating and power consumption of Snapdragon HP PCs?",
        "top_k": 2
    }
    r_res = client.post("/api/agents/rag", json=r_req)
    assert r_res.status_code == 200, f"RAG failed: {r_res.status_code}"
    r_data = r_res.json()
    assert len(r_data["citations"]) == 2, f"Expected 2 citations, got {len(r_data['citations'])}"
    assert r_data["similarity_score"] > 0.45, f"Similarity score too low: {r_data['similarity_score']}"
    print(f"  --> Neural RAG OK: {len(r_data['citations'])} Citations, Match={(r_data['similarity_score']*100):.1f}% ({r_data['latency_ms']}ms)")

    # -------------------------------------------------------------
    # 5. Vision Security Shield Tests (USP 4: YOLOv8-Nano INT8)
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing Vision Security Shield Agent (YOLOv8-Nano)...")
    vis_req = {
        "sample_type": "phishing_email",
        "image_name": "phishing_sample.png"
    }
    vis_res = client.post("/api/agents/vision", json=vis_req)
    assert vis_res.status_code == 200, f"Vision scan failed: {vis_res.status_code}"
    vis_data = vis_res.json()
    assert vis_data["threat_level"] in ["SUSPICIOUS", "CRITICAL_THREAT"], "Phishing sample not flagged"
    assert vis_data["quarantine_recommended"] is True, "Quarantine should be recommended"
    print(f"  --> Vision Shield OK: Threat Level='{vis_data['threat_level']}', Score={vis_data['threat_score']}/100, Quarantine=True")

    # -------------------------------------------------------------
    # 6. Adversarial Stress & ReDoS Bounding Checks
    # -------------------------------------------------------------
    print("\n[TEST 6] Running Adversarial Stress & ReDoS Bounding Checks...")
    
    # 6A. ReDoS attack vector check
    redos_payload = "sk-" + ("a" * 5000) + "!"
    start_t = time.time()
    stress_res = client.post("/api/agents/workspace", json={"content": redos_payload})
    elapsed_ms = (time.time() - start_t) * 1000
    assert stress_res.status_code == 200, "Failed under ReDoS stress vector"
    assert elapsed_ms < 500, f"ReDoS took too long: {elapsed_ms}ms (CPU lock risk)"
    print(f"  --> ReDoS Vector Defended: Processed hostile string in {elapsed_ms:.2f}ms (Non-blocking)")

    # 6B. 64KB Payload Bounding Check
    large_payload = "Snapdragon AI " * 4500  # ~63KB string
    start_t = time.time()
    large_res = client.post("/api/agents/workspace", json={"content": large_payload})
    large_elapsed = (time.time() - start_t) * 1000
    assert large_res.status_code == 200, "Failed on large 64KB payload"
    print(f"  --> 64KB Oversized Payload Handled: Processed {len(large_payload)} bytes in {large_elapsed:.2f}ms")

    # -------------------------------------------------------------
    # 7. Static Assets & Web Gateway Route Tests
    # -------------------------------------------------------------
    print("\n[TEST 7] Verifying Web Cockpit & Static Assets Mounting...")
    idx_res = client.get("/")
    assert idx_res.status_code == 200 and len(idx_res.text) > 1000, "Index HTML failed"
    css_res = client.get("/static/styles.css")
    assert css_res.status_code == 200 and len(css_res.text) > 1000, "Styles CSS failed"
    js_res = client.get("/static/app.js")
    assert js_res.status_code == 200 and len(js_res.text) > 1000, "App JS failed"
    print("  --> Static Assets OK: index.html, styles.css, app.js verified")

    print("\n==================================================================")
    print("[SUCCESS] ALL 7 VERIFICATION STAGES PASSED WITH 100% TEST PASS RATE!")
    print("==================================================================")


if __name__ == "__main__":
    test_suite()
