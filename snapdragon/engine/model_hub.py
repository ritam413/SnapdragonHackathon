"""
Qualcomm AI Hub Model Registry & Execution Profiles for Snapdragon PCs
"""

from typing import Dict, Any, List


QUALCOMM_AI_HUB_MODELS: Dict[str, Dict[str, Any]] = {
    "whisper_base_en_qnn": {
        "name": "Whisper Base (English) - Qualcomm AI Hub Optimized",
        "category": "Speech Recognition",
        "framework": "ONNX / QNN",
        "precision": "INT8 / FP16 Mixed",
        "npu_ops_ratio": "98.4%",
        "npu_tops_target": 22.5,
        "average_latency_ms": 14.2,
        "energy_consumption_mw": 320,
        "hub_model_id": "qualcomm/whisper-base-en-qnn",
        "description": "High-throughput on-device speech transcription optimized for Qualcomm Hexagon NPU Vector Extensions (HVX)."
    },
    "phi_3_5_mini_instruct_qnn": {
        "name": "Phi-3.5 Mini Instruct (3.8B) - INT4 AWQ",
        "category": "Small Language Model (SLM)",
        "framework": "Qualcomm GenieX / QNN Direct",
        "precision": "INT4 (Activation-aware Weight Quantization)",
        "npu_ops_ratio": "96.8%",
        "npu_tops_target": 38.0,
        "average_latency_ms": 11.5,
        "tokens_per_sec": 42.8,
        "energy_consumption_mw": 840,
        "hub_model_id": "qualcomm/phi-3-5-mini-instruct-int4",
        "description": "Ultra-fast on-device reasoning, summarization, and autonomous action extraction on Snapdragon X Elite NPU."
    },
    "all_minilm_l6_v2_qnn": {
        "name": "All-MiniLM-L6-v2 Dense Embeddings - QNN",
        "category": "Vector Embeddings",
        "framework": "ONNX Runtime QNN EP",
        "precision": "INT8 Static Quantized",
        "npu_ops_ratio": "99.2%",
        "npu_tops_target": 18.0,
        "average_latency_ms": 4.1,
        "energy_consumption_mw": 180,
        "hub_model_id": "qualcomm/all-minilm-l6-v2-qnn",
        "description": "Sub-5ms dense embedding generation for confidential on-device RAG vector searches."
    },
    "yolov8_nano_qnn": {
        "name": "YOLOv8-Nano Vision Security Shield",
        "category": "Computer Vision & OCR",
        "framework": "Qualcomm AI Hub CV Model",
        "precision": "INT8 Quantized",
        "npu_ops_ratio": "99.8%",
        "npu_tops_target": 28.5,
        "average_latency_ms": 6.8,
        "energy_consumption_mw": 260,
        "hub_model_id": "qualcomm/yolov8-nano-qnn",
        "description": "Real-time edge visual inspection for QR codes, phishing attachments, suspicious UI overlays, and visual PII."
    }
}


def get_model_metadata(model_key: str) -> Dict[str, Any]:
    return QUALCOMM_AI_HUB_MODELS.get(model_key, {
        "name": "Generic Qualcomm AI Model",
        "precision": "INT8",
        "npu_ops_ratio": "95.0%",
        "npu_tops_target": 20.0,
        "average_latency_ms": 15.0
    })


def list_registered_models() -> List[Dict[str, Any]]:
    return [
        {"key": k, **v} for k, v in QUALCOMM_AI_HUB_MODELS.items()
    ]
