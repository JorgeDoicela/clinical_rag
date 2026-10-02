"""
Implementación limpia y no operativa (NoOp) para el cliente de telemetría de ChromaDB.
Elimina la colisión de firmas entre versiones de PostHog/ChromaDB y asegura
privacidad estricta de datos clínicos bajo normativas HIPAA/GDPR.
"""
from overrides import override
from chromadb.telemetry.product import ProductTelemetryClient, ProductTelemetryEvent


class NoOpProductTelemetry(ProductTelemetryClient):
    """Cliente de telemetría nulo para suprimir emisión de eventos externos."""

    @override
    def capture(self, event: ProductTelemetryEvent) -> None:
        pass
