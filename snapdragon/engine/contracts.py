"""
API Contracts and Data Models for SnapEdge AI on Snapdragon HP PCs
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class ExecutionProvider(str, Enum):
    QNN = "QNNExecutionProvider"          # Qualcomm Hexagon NPU
    DIRECTML = "DmlExecutionProvider"     # DirectML NPU/GPU
    CPU = "CPUExecutionProvider"         # Host Fallback


class HardwareTelemetry(BaseModel):
    npu_utilization_pct: float = Field(..., description="Hexagon NPU utilization %")
    tops_current: float = Field(..., description="Active TOPS throughput (0-45 TOPS)")
    latency_ms: float = Field(..., description="Average inference latency in milliseconds")
    npu_power_watts: float = Field(..., description="Snapdragon NPU active power draw (~3.5W - 4.2W)")
    cpu_equivalent_power_watts: float = Field(..., description="Estimated traditional x86 CPU power (~38W - 55W)")
    power_savings_multiplier: float = Field(..., description="Ratio of power efficiency (e.g. 10.5x)")
    tokens_per_second: float = Field(..., description="Throughput tokens per second")
    active_provider: ExecutionProvider
    active_models: List[str]
    device_name: str = "HP OmniBook Ultra (Snapdragon® X Elite - 45 TOPS NPU)"
    npu_temperature_c: float = 38.5


class ActionItem(BaseModel):
    id: str
    title: str
    deadline: Optional[str] = None
    urgency: str  # "High" | "Medium" | "Low"
    action_type: str  # "Reply" | "Calendar" | "Review" | "Urgent Alert"
    confidence_score: float
    recommended_action: str


class WorkspaceTriageRequest(BaseModel):
    content: str = Field(..., description="Raw text of email, notification, or memo")
    sender: Optional[str] = "Unknown Sender"
    subject: Optional[str] = "Untitled Subject"
    category_hint: Optional[str] = None


class WorkspaceTriageResponse(BaseModel):
    category: str  # "Opportunity" | "Urgent Action Required" | "Security Alert" | "Routine Information"
    summary: str
    action_items: List[ActionItem]
    suggested_reply: Optional[str] = None
    pii_redacted: bool
    sanitized_preview: str
    execution_time_ms: float
    hardware_accelerator: str
    npu_tops_engaged: float


class VoiceTranscribeRequest(BaseModel):
    audio_sample_id: Optional[str] = None
    audio_text_simulated: Optional[str] = None
    meeting_context: Optional[str] = "Executive Strategy Briefing"


class VoiceTranscribeResponse(BaseModel):
    transcript: str
    speakers_detected: int
    duration_seconds: float
    key_decisions: List[str]
    assigned_tasks: List[ActionItem]
    latency_ms: float
    accelerator: str
    npu_tops_engaged: float


class DocumentRAGRequest(BaseModel):
    query: str
    document_context: Optional[str] = None
    top_k: int = 3


class RAGCitation(BaseModel):
    chunk_id: int
    snippet: str
    relevance_score: float


class DocumentRAGResponse(BaseModel):
    answer: str
    citations: List[RAGCitation]
    similarity_score: float
    latency_ms: float
    accelerator: str
    npu_tops_engaged: float


class VisionScanRequest(BaseModel):
    image_name: Optional[str] = "sample_attachment.png"
    sample_type: str = "phishing_email"  # "phishing_email" | "sensitive_contract" | "qr_invoice" | "clean_chart"
    custom_text_content: Optional[str] = None


class VisionScanResponse(BaseModel):
    threat_level: str  # "SAFE" | "SUSPICIOUS" | "CRITICAL_THREAT"
    threat_score: float  # 0.0 to 100.0
    detected_anomalies: List[str]
    ocr_extracted_text: str
    pii_elements: List[str]
    quarantine_recommended: bool
    executive_advisory: str
    latency_ms: float
    accelerator: str
    npu_tops_engaged: float
