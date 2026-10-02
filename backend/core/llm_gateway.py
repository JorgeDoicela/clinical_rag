import time
import json
from enum import Enum
from typing import List, Tuple, Optional, Dict, Any
from google import genai
from google.genai import types
from core.config import settings


class CircuitStatus(str, Enum):
    CLOSED = "CLOSED"      # Operativo normal
    OPEN = "OPEN"          # En cuarentena por fallo reciente
    HALF_OPEN = "HALF_OPEN"  # Prueba de recuperación


class LLMException(Exception):
    """Excepción base del Gateway de LLM."""
    pass


class FatalLLMException(LLMException):
    """Excepción para errores no recuperables (credenciales inválidas, payload corrupto)."""
    pass


class AllModelsExhaustedException(LLMException):
    """Lanzada cuando todos los modelos de la cadena de fallback fallaron."""
    pass


class LLMGenerationResult:
    """Resultado estructurado de inferencia con trazabilidad de modelo."""
    def __init__(self, text: str, model_used: str, fallback_occurred: bool, attempts: List[Dict[str, Any]]):
        self.text = text
        self.model_used = model_used
        self.fallback_occurred = fallback_occurred
        self.attempts = attempts

    def json_dict(self) -> Dict[str, Any]:
        try:
            return json.loads(self.text)
        except Exception:
            return {}


class ResilientLLMGateway:
    """
    Gateway de Inferencia Resiliente con Circuit Breaker y Fallback Hierarchy.
    Garantiza alta disponibilidad, cero latencia fantasma ante modelos deprecados o cuotas agotadas,
    y observabilidad completa de cada invocación.
    """
    def __init__(self):
        self._circuit_states: Dict[str, CircuitStatus] = {}
        self._opened_until: Dict[str, float] = {}
        self._client: Optional[genai.Client] = None
        self._client_key: Optional[str] = None

    def _get_client(self) -> genai.Client:
        key = settings.gemini_api_key.strip()
        if not key:
            raise FatalLLMException("GEMINI_API_KEY no está configurada en el archivo de entorno (.env).")
        if self._client is None or self._client_key != key:
            self._client = genai.Client(api_key=key)
            self._client_key = key
        return self._client

    def _is_model_available(self, model_name: str) -> bool:
        status = self._circuit_states.get(model_name, CircuitStatus.CLOSED)
        if status == CircuitStatus.CLOSED:
            return True

        now = time.time()
        cooldown_until = self._opened_until.get(model_name, 0.0)

        if status == CircuitStatus.OPEN:
            if now >= cooldown_until:
                self._circuit_states[model_name] = CircuitStatus.HALF_OPEN
                print(f"[LLM_GATEWAY] Cooldown vencido para '{model_name}'. Estado: HALF_OPEN (probando recuperación)...", flush=True)
                return True
            return False

        if status == CircuitStatus.HALF_OPEN:
            return True

        return True

    def _record_success(self, model_name: str):
        prev_status = self._circuit_states.get(model_name, CircuitStatus.CLOSED)
        if prev_status != CircuitStatus.CLOSED:
            print(f"[LLM_GATEWAY] Modelo '{model_name}' recuperado con éxito. Circuito RESTABLECIDO a CLOSED.", flush=True)
        self._circuit_states[model_name] = CircuitStatus.CLOSED
        self._opened_until.pop(model_name, None)

    def _record_failure(self, model_name: str, error: Exception):
        err_msg = str(error).lower()
        now = time.time()
        cooldown = settings.gemini_circuit_cooldown_seconds

        # 1. Error Fatal: Credenciales inválidas o no autorizadas
        if "401" in err_msg or "403" in err_msg or "api_key_invalid" in err_msg or "permissiondenied" in err_msg:
            raise FatalLLMException(f"Error de autenticación fatal en Gemini con API Key: {error}")

        # 2. Errores Transitorios / De Modelo: 404 (deprecado), 429 (cuota/rate limit), 503 (servidor saturado), timeouts
        self._circuit_states[model_name] = CircuitStatus.OPEN
        self._opened_until[model_name] = now + cooldown

        summary = "404 No Disponible/Deprecado" if "404" in err_msg else (
            "429 Cuota/Rate Limit" if "429" in err_msg or "resource_exhausted" in err_msg else (
                "503 Servicio No Disponible" if "503" in err_msg else "Fallo de Inferencia/Red"
            )
        )

        print(
            f"[LLM_GATEWAY] Circuito ABIERTO para '{model_name}' durante {cooldown}s. "
            f"Causa: {summary}. Detalle: {error}",
            flush=True
        )

    def generate(
        self,
        prompt: str,
        imagenes_list: Optional[List[Tuple[bytes, str]]] = None,
        system_instruction: Optional[str] = None,
        response_mime_type: Optional[str] = None,
        temperature: float = 0.2
    ) -> LLMGenerationResult:
        """
        Ejecuta inferencia resiliente atravesando la cascada de modelos configurados.
        Si un modelo tiene el circuito abierto, se omite de forma instantánea sin generar latencia.
        """
        client = self._get_client()
        models_cascade = settings.get_models_cascade()
        attempts: List[Dict[str, Any]] = []

        # Preparar contenido
        if imagenes_list:
            image_parts = [
                types.Part.from_bytes(data=img_bytes, mime_type=mime_type)
                for img_bytes, mime_type in imagenes_list
            ]
            contents = image_parts + [prompt]
        else:
            contents = prompt

        config_kwargs: Dict[str, Any] = {"temperature": temperature}
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if response_mime_type:
            config_kwargs["response_mime_type"] = response_mime_type

        gen_config = types.GenerateContentConfig(**config_kwargs)

        # Evaluar candidatos disponibles
        primary_model = models_cascade[0]
        for idx, model_name in enumerate(models_cascade):
            if not self._is_model_available(model_name):
                attempts.append({
                    "model": model_name,
                    "status": "SKIPPED_CIRCUIT_OPEN",
                    "reason": f"En cuarentena por fallo previo hasta timestamp {self._opened_until.get(model_name)}"
                })
                continue

            try:
                print(f"[LLM_GATEWAY] Invocando modelo '{model_name}' (Intento {idx + 1}/{len(models_cascade)})...", flush=True)
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=gen_config
                )
                text = response.text or ""
                self._record_success(model_name)

                fallback_occurred = (model_name != primary_model)
                if fallback_occurred:
                    print(f"[LLM_GATEWAY] Fallback exitoso: Petición resuelta por modelo de respaldo '{model_name}'.", flush=True)

                attempts.append({"model": model_name, "status": "SUCCESS"})
                return LLMGenerationResult(
                    text=text,
                    model_used=model_name,
                    fallback_occurred=fallback_occurred,
                    attempts=attempts
                )

            except FatalLLMException:
                raise
            except Exception as err:
                attempts.append({"model": model_name, "status": "FAILED", "error": str(err)})
                self._record_failure(model_name, err)

        # Si todos los modelos disponibles en la cadena fallaron
        raise AllModelsExhaustedException(
            f"Se agotaron todos los modelos configurados en la cadena de fallback ({models_cascade}). "
            f"Historial de intentos: {attempts}"
        )


# Singleton del Gateway para reutilización de estado del Circuit Breaker en todo el ciclo de vida del backend
llm_gateway = ResilientLLMGateway()
