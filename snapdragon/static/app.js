/**
 * SnapEdge AI — Dashboard & Telemetry Streamer Client
 * Hardened for offline operation, auto-reconnecting WebSocket, and zero-slop UI updates.
 */

// Global State
let ws = null;
let reconnectTimer = null;
let currentVisionPreset = 'phishing_email';

// Presets Data
const PRESETS = {
    workspace: {
        hackathon: {
            content: `Subject: Invitation: Qualcomm & HP Snapdragon AI Lab Build & Present Challenge\nFrom: challenges@qualcomm.com\n\nDear Developer,\nYou are cordially invited to submit your on-device AI solution for the Snapdragon AI Lab Challenge by 30 Sep 2026, 11:59 PM IST. Top projects receive hardware grants and incubation support. Please ensure all inference models are compiled via Qualcomm AI Hub. Key: sk-live99887766554433221100`,
            sender: "challenges@qualcomm.com",
            subject: "Snapdragon AI Lab Challenge"
        },
        urgent: {
            content: `URGENT ACTION REQUIRED: The quarterly security compliance audit for local HP OmniBook fleet is due today before 5:00 PM IST. Please run telemetry diagnostics and submit power efficiency logs immediately. Contact security-lead@hp.com for access token.`,
            sender: "security-ops@hp.com",
            subject: "Urgent Compliance Audit"
        },
        pii: {
            content: `CONFIDENTIAL NOTE: Here is the client onboarding record. Aadhaar ID: 4532 9812 7741. Corporate Card: 4532-1199-8833-2211 (Exp 12/28). Internal API Token: ghp_99887766554433221100aabbccddeeff. Please file into secure local storage.`,
            sender: "hr-confidential@hp.com",
            subject: "Employee Record"
        }
    },
    voice: {
        product_sync: "In today's sync, Alex confirmed the QNN execution provider is fully verified on the Snapdragon X Elite NPU. Sarah will complete the frontend cockpit UI by 6:00 PM. We decided to prioritize INT4 Phi-3.5 for local document summarization to ensure sub-10ms response times.",
        security_review: "Security audit note: all four AI agents operate strictly within the user's HP PC memory boundary. No telemetry or embeddings egress to the cloud. John was assigned to verify regex sanitization across credit cards and API secrets.",
        board_briefing: "Executive briefing: Snapdragon X Elite delivers 45 TOPS on the Hexagon NPU at only 3.8 Watts, generating a 10.5x energy efficiency multiplier compared to legacy x86 CPUs. Recommendation: standardize SnapEdge AI across enterprise laptops."
    },
    vision: {
        phishing_email: {
            title: "Target: Phishing Email Attachment (credential_harvest.png)",
            desc: "Visual spoofing of Qualcomm corporate single sign-on with hidden redirection links."
        },
        sensitive_contract: {
            title: "Target: Unredacted NDA Agreement (nda_signed.pdf)",
            desc: "High-resolution scan containing unmasked bank account numbers and physical signatures."
        },
        qr_invoice: {
            title: "Target: Fraudulent QR Payment Invoice (invoice_qr.png)",
            desc: "Invoice graphic embedding suspicious malicious URL inside a dynamic QR barcode."
        },
        clean_chart: {
            title: "Target: Qualcomm AI Hub Benchmark Report (npu_benchmark.png)",
            desc: "Official benchmark chart illustrating 45 TOPS throughput at 3.9 Watts."
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initTelemetryWebSocket();
    loadModelsHub();
    loadWorkspacePreset('hackathon');
    loadVoicePreset('product_sync');
    loadVisionPreset('phishing_email');
});

// Tab Switching
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const activePane = document.getElementById(`pane-${targetTab}`);
            if (activePane) activePane.classList.add('active');
        });
    });
}

// Telemetry WebSocket with Auto-Reconnect
function initTelemetryWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || '127.0.0.1:8080';
    const wsUrl = `${protocol}//${host}/ws/telemetry`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[SnapEdge WS] Connected to live NPU telemetry');
            clearTimeout(reconnectTimer);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                updateTelemetryUI(data);
            } catch (e) {
                console.error('[SnapEdge WS] Error parsing telemetry JSON', e);
            }
        };

        ws.onclose = () => {
            console.warn('[SnapEdge WS] Disconnected. Retrying in 2.5s...');
            reconnectTimer = setTimeout(initTelemetryWebSocket, 2500);
        };

        ws.onerror = () => {
            ws.close();
        };
    } catch (err) {
        console.error('[SnapEdge WS] WebSocket init failed, falling back to polling', err);
        setInterval(fetchTelemetryHttp, 2000);
    }
}

// HTTP Polling Fallback
async function fetchTelemetryHttp() {
    try {
        const res = await fetch('/api/telemetry');
        if (res.ok) {
            const data = await res.json();
            updateTelemetryUI(data);
        }
    } catch (e) {
        // Backend offline or unreachable
    }
}

// Update Telemetry HUD Elements Safely
function updateTelemetryUI(data) {
    if (!data) return;

    safeSetText('nav-provider', data.active_provider || 'QNNExecutionProvider');
    safeSetText('nav-power-mult', `${(data.power_savings_multiplier || 10.5).toFixed(1)}x Efficient`);
    safeSetText('hud-tops', (data.tops_current || 28.5).toFixed(1));
    safeSetText('hud-util', `${Math.round(data.npu_utilization_pct || 45)}%`);
    safeSetText('hud-temp', `${(data.npu_temperature_c || 38.5).toFixed(1)}°C`);

    const npuBar = document.getElementById('npu-bar');
    if (npuBar) {
        npuBar.style.width = `${Math.min(100, Math.max(10, data.npu_utilization_pct || 50))}%`;
    }

    safeSetText('hud-npu-power', `${(data.npu_power_watts || 3.8).toFixed(1)} W`);
    safeSetText('hud-cpu-power', `${(data.cpu_equivalent_power_watts || 42.0).toFixed(1)} W`);
    safeSetText('hud-latency', `${(data.latency_ms || 8.5).toFixed(1)} ms`);
    safeSetText('hud-tps', `${(data.tokens_per_second || 42.0).toFixed(1)} t/s`);
}

// Safe DOM text setter
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// TAB 1: WORKSPACE AGENT
function loadWorkspacePreset(key) {
    const preset = PRESETS.workspace[key];
    if (!preset) return;
    const input = document.getElementById('workspace-input');
    if (input) input.value = preset.content;
}

async function executeWorkspaceTriage() {
    const input = document.getElementById('workspace-input');
    const status = document.getElementById('workspace-status');
    const resultsBox = document.getElementById('workspace-results');
    const catBadge = document.getElementById('res-category');

    if (!input || !input.value.trim()) return;

    if (status) status.textContent = 'Processing on NPU...';
    if (resultsBox) resultsBox.innerHTML = '<div class="empty-state">Engaging Qualcomm Hexagon NPU...</div>';

    try {
        const res = await fetch('/api/agents/workspace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: input.value })
        });
        const data = await res.json();

        if (status) status.textContent = `Completed in ${data.execution_time_ms}ms`;
        if (catBadge) {
            catBadge.textContent = data.category;
            catBadge.className = 'badge-cat ' + (data.category === 'Opportunity' ? 'text-green' : data.category.includes('Urgent') ? 'text-red' : 'text-cyan');
        }

        let actionsHtml = data.action_items.map(act => `
            <div class="action-card">
                <div class="action-top">
                    <span class="action-badge ${act.urgency === 'High' ? 'badge-high' : 'badge-med'}">${act.action_type} &bull; ${act.urgency}</span>
                    <span class="action-deadline">⏰ ${act.deadline || 'No deadline'}</span>
                </div>
                <div class="action-title">${act.title}</div>
                <div class="action-recom">💡 <strong>Action:</strong> ${act.recommended_action}</div>
            </div>
        `).join('');

        let piiHtml = data.pii_redacted 
            ? `<div class="pii-alert-box">🛡️ <strong>PII & Secrets Scrubbed:</strong> Sensitive keys/IDs were sanitized on-device before extraction.</div>`
            : '';

        resultsBox.innerHTML = `
            ${piiHtml}
            <div class="result-summary">
                <strong>Local Summary:</strong> ${data.summary}
            </div>
            <div class="actions-list">
                <h4 style="margin: 12px 0 8px; font-size: 0.9rem; color: var(--text-secondary);">AUTONOMOUS ACTIONS GENERATED:</h4>
                ${actionsHtml}
            </div>
            <div class="reply-box">
                <h4 style="margin: 12px 0 6px; font-size: 0.9rem; color: var(--text-secondary);">AIR-GAPPED SUGGESTED DRAFT:</h4>
                <div class="reply-text">${data.suggested_reply || 'No draft required.'}</div>
            </div>
            <div class="npu-meta-footer">
                ⚡ Accelerator: <strong>${data.hardware_accelerator}</strong> &bull; NPU Burst: <strong>${data.npu_tops_engaged} TOPS</strong>
            </div>
        `;
    } catch (err) {
        if (status) status.textContent = 'Error';
        if (resultsBox) resultsBox.innerHTML = `<div class="empty-state text-red">Failed to reach SnapEdge API: ${err.message}</div>`;
    }
}

// TAB 2: VOICE AGENT
function loadVoicePreset(key) {
    const text = PRESETS.voice[key];
    if (!text) return;
    const input = document.getElementById('voice-input');
    if (input) input.value = text;
}

async function executeVoiceTranscribe() {
    const input = document.getElementById('voice-input');
    const status = document.getElementById('voice-status');
    const resultsBox = document.getElementById('voice-results');

    if (!input || !input.value.trim()) return;

    if (status) status.textContent = 'Transcribing on NPU...';
    if (resultsBox) resultsBox.innerHTML = '<div class="empty-state">Running Whisper-Base INT8 QNN...</div>';

    try {
        const res = await fetch('/api/agents/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_text_simulated: input.value, meeting_context: 'Executive Standup' })
        });
        const data = await res.json();

        if (status) status.textContent = `Completed in ${data.latency_ms}ms`;

        let decisionsHtml = data.key_decisions.map(d => `<li>${d}</li>`).join('');
        let tasksHtml = data.assigned_tasks.map(t => `
            <div class="action-card">
                <div class="action-top">
                    <span class="action-badge badge-high">${t.action_type}</span>
                    <span class="action-deadline">⏰ ${t.deadline || 'Today'}</span>
                </div>
                <div class="action-title">${t.title}</div>
                <div class="action-recom">👤 <strong>Assigned:</strong> ${t.recommended_action}</div>
            </div>
        `).join('');

        resultsBox.innerHTML = `
            <div class="voice-transcript-box">
                <strong>Clean Transcript (${data.speakers_detected} Speakers, ${data.duration_seconds}s):</strong>
                <p style="margin-top: 6px; font-size: 0.95rem; color: var(--text-primary);">${data.transcript}</p>
            </div>
            <div style="margin-top: 14px;">
                <h4 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 6px;">KEY DECISIONS AGREED:</h4>
                <ul style="padding-left: 20px; font-size: 0.9rem; color: var(--accent-cyan); line-height: 1.6;">
                    ${decisionsHtml}
                </ul>
            </div>
            <div style="margin-top: 14px;">
                <h4 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 6px;">ASSIGNED TASKS:</h4>
                ${tasksHtml}
            </div>
            <div class="npu-meta-footer">
                ⚡ Accelerator: <strong>${data.accelerator}</strong> &bull; Latency: <strong>${data.latency_ms} ms</strong>
            </div>
        `;
    } catch (err) {
        if (status) status.textContent = 'Error';
        if (resultsBox) resultsBox.innerHTML = `<div class="empty-state text-red">Inference failed: ${err.message}</div>`;
    }
}

// TAB 3: NEURAL RAG AGENT
function setRAGQuery(queryText) {
    const input = document.getElementById('rag-query');
    if (input) {
        input.value = queryText;
        executeRAGQuery();
    }
}

async function executeRAGQuery() {
    const input = document.getElementById('rag-query');
    const status = document.getElementById('rag-status');
    const resultsBox = document.getElementById('rag-results');

    if (!input || !input.value.trim()) return;

    if (status) status.textContent = 'Searching vectors...';
    if (resultsBox) resultsBox.innerHTML = '<div class="empty-state">Running All-MiniLM-L6 vector embeddings...</div>';

    try {
        const res = await fetch('/api/agents/rag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: input.value, top_k: 2 })
        });
        const data = await res.json();

        if (status) status.textContent = `Answered in ${data.latency_ms}ms`;

        let citationsHtml = data.citations.map(c => `
            <div class="citation-card">
                <div class="citation-header">
                    <span>📄 Chunk #${c.chunk_id}</span>
                    <span class="badge-cat text-green">${(c.relevance_score * 100).toFixed(1)}% Match</span>
                </div>
                <div class="citation-text">"${c.snippet}"</div>
            </div>
        `).join('');

        resultsBox.innerHTML = `
            <div class="rag-answer-box">
                <h4 style="font-size: 0.9rem; color: var(--accent-cyan); margin-bottom: 6px;">SYNTHESIZED ANSWER (ON-DEVICE SLM):</h4>
                <p style="font-size: 0.95rem; line-height: 1.6;">${data.answer}</p>
            </div>
            <div style="margin-top: 14px;">
                <h4 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 6px;">VERIFIED SOURCE CITATIONS:</h4>
                ${citationsHtml}
            </div>
            <div class="npu-meta-footer">
                ⚡ Vector Engine: <strong>${data.accelerator}</strong> &bull; Similarity: <strong>${(data.similarity_score * 100).toFixed(1)}%</strong>
            </div>
        `;
    } catch (err) {
        if (status) status.textContent = 'Error';
        if (resultsBox) resultsBox.innerHTML = `<div class="empty-state text-red">Search failed: ${err.message}</div>`;
    }
}

// TAB 4: VISION SECURITY SHIELD
function loadVisionPreset(key) {
    currentVisionPreset = key;
    const preset = PRESETS.vision[key];
    if (!preset) return;

    safeSetText('vis-target-title', preset.title);
    safeSetText('vis-target-desc', preset.desc);
}

async function executeVisionScan() {
    const status = document.getElementById('vision-status');
    const resultsBox = document.getElementById('vision-results');
    const badge = document.getElementById('vision-threat-badge');

    if (status) status.textContent = 'Scanning image on NPU...';
    if (resultsBox) resultsBox.innerHTML = '<div class="empty-state">Running YOLOv8-Nano INT8 Vision Shield...</div>';

    try {
        const res = await fetch('/api/agents/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sample_type: currentVisionPreset, image_name: `${currentVisionPreset}.png` })
        });
        const data = await res.json();

        if (status) status.textContent = `Scan complete in ${data.latency_ms}ms`;
        if (badge) {
            badge.textContent = data.threat_level;
            badge.className = 'badge-cat ' + (data.threat_level === 'SAFE' ? 'text-green' : data.threat_level === 'CRITICAL_THREAT' ? 'text-red' : 'text-amber');
        }

        let anomaliesHtml = data.detected_anomalies.map(a => `<li>${a}</li>`).join('');
        let piiListHtml = data.pii_elements.length > 0 
            ? `<div style="margin-top: 10px; font-size: 0.85rem; color: var(--accent-red);">⚠️ Unmasked Data Found: ${data.pii_elements.join(', ')}</div>` 
            : '';

        resultsBox.innerHTML = `
            <div class="threat-score-row">
                <div>Threat Score: <strong class="${data.threat_score > 50 ? 'text-red' : 'text-green'}">${data.threat_score}/100</strong></div>
                <div>Quarantine: <strong>${data.quarantine_recommended ? '🚨 ACTIVE' : 'CLEARED'}</strong></div>
            </div>
            <div style="margin-top: 12px;">
                <h4 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 6px;">DETECTED VISUAL ANOMALIES:</h4>
                <ul style="padding-left: 20px; font-size: 0.9rem; line-height: 1.6;">
                    ${anomaliesHtml}
                </ul>
                ${piiListHtml}
            </div>
            <div class="advisory-box" style="margin-top: 14px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border-left: 3px solid var(--accent-blue);">
                <strong style="color: var(--accent-cyan); font-size: 0.85rem;">EXECUTIVE ADVISORY:</strong>
                <p style="margin-top: 4px; font-size: 0.9rem;">${data.executive_advisory}</p>
            </div>
            <div class="npu-meta-footer">
                ⚡ Vision Model: <strong>${data.accelerator}</strong> &bull; Latency: <strong>${data.latency_ms} ms</strong>
            </div>
        `;
    } catch (err) {
        if (status) status.textContent = 'Error';
        if (resultsBox) resultsBox.innerHTML = `<div class="empty-state text-red">Vision scan failed: ${err.message}</div>`;
    }
}

// TAB 5: QUALCOMM AI HUB MODELS REGISTRY
async function loadModelsHub() {
    const container = document.getElementById('models-container');
    if (!container) return;

    try {
        const res = await fetch('/api/models');
        const data = await res.json();

        container.innerHTML = data.models.map(m => `
            <div class="model-card">
                <div class="model-header">
                    <span class="model-title">${m.name}</span>
                    <span class="badge-cat text-cyan">${m.quantization}</span>
                </div>
                <div class="model-desc">${m.purpose}</div>
                <div class="model-specs">
                    <div class="spec-item">
                        <span class="spec-label">Target Hardware</span>
                        <span class="spec-val">${m.target_hardware}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Memory Footprint</span>
                        <span class="spec-val">${m.memory_footprint_mb} MB</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Avg Latency</span>
                        <span class="spec-val text-green">${m.latency_ms} ms</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Compilation Status</span>
                        <span class="spec-val text-cyan">${m.status}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<div class="empty-state text-red">Failed to load models list.</div>`;
    }
}
