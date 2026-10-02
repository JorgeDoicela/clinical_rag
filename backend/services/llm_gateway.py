"""
Módulo de compatibilidad para backend/services/llm_gateway.py.
Delega directamente en la implementación centralizada en core/llm_gateway.py.
"""
from core.llm_gateway import (
    CircuitStatus,
    LLMException,
    FatalLLMException,
    AllModelsExhaustedException,
    LLMGenerationResult,
    ResilientLLMGateway,
    llm_gateway,
)

__all__ = [
    "CircuitStatus",
    "LLMException",
    "FatalLLMException",
    "AllModelsExhaustedException",
    "LLMGenerationResult",
    "ResilientLLMGateway",
    "llm_gateway",
]
