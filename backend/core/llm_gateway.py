import time
import json
from enum import Enum
from typing import List, Tuple, Optional, Dict, Any
from google import genai
from google.genai import types
from core.config import settings
from core.logger import get_logger

logger = get_logger("ateneo.llm_gateway")



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
                logger.info(f"Cooldown vencido para '{model_name}'. Estado: HALF_OPEN (probando recuperación)...", extra={"action": "circuit_half_open", "model": model_name})
                return True
            return False

        if status == CircuitStatus.HALF_OPEN:
            return True

        return True

    def _record_success(self, model_name: str):
        prev_status = self._circuit_states.get(model_name, CircuitStatus.CLOSED)
        if prev_status != CircuitStatus.CLOSED:
            logger.info(f"Modelo '{model_name}' recuperado con éxito. Circuito RESTABLECIDO a CLOSED.", extra={"action": "circuit_closed", "model": model_name})
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

        logger.warning(
            f"Circuito ABIERTO para '{model_name}' durante {cooldown}s. Causa: {summary}. Detalle: {error}",
            extra={"action": "circuit_opened", "model": model_name, "cooldown_seconds": cooldown, "cause": summary}
        )


    def get_circuit_breakers_status(self) -> Dict[str, Any]:
        """
        Retorna el estado de observabilidad de los Circuit Breakers para cada modelo en la cascada.
        Calcula tiempos de cooldown restantes y estados efectivos (CLOSED, OPEN, HALF_OPEN).
        """
        models_cascade = settings.get_models_cascade()
        now = time.time()
        models_report: Dict[str, Any] = {}
        open_count = 0
        half_open_count = 0

        for model_name in models_cascade:
            raw_status = self._circuit_states.get(model_name, CircuitStatus.CLOSED)
            cooldown_until = self._opened_until.get(model_name)

            if raw_status == CircuitStatus.OPEN:
                if cooldown_until and now >= cooldown_until:
                    effective_status = CircuitStatus.HALF_OPEN
                    remaining = 0.0
                    half_open_count += 1
                else:
                    effective_status = CircuitStatus.OPEN
                    remaining = max(0.0, round((cooldown_until or now) - now, 2))
                    open_count += 1
            elif raw_status == CircuitStatus.HALF_OPEN:
                effective_status = CircuitStatus.HALF_OPEN
                remaining = 0.0
                half_open_count += 1
            else:
                effective_status = CircuitStatus.CLOSED
                remaining = 0.0

            models_report[model_name] = {
                "status": effective_status.value,
                "cooldown_remaining_seconds": remaining,
                "cooldown_until": cooldown_until,
            }

        total_models = len(models_cascade)
        if open_count == total_models:
            global_status = "EXHAUSTED"
        elif open_count > 0 or half_open_count > 0:
            global_status = "DEGRADED"
        else:
            global_status = "OPERATIONAL"

        return {
            "status": global_status,
            "total_models": total_models,
            "active_models": total_models - open_count,
            "cooldown_configured_seconds": settings.gemini_circuit_cooldown_seconds,
            "models": models_report,
        }

    def set_circuit_state(self, model_name: str, status: CircuitStatus, cooldown_seconds: Optional[float] = None):
        """Asigna manualmente el estado de un circuito (útil para auditoría, telemetría y pruebas)."""
        self._circuit_states[model_name] = status
        if status == CircuitStatus.OPEN:
            cd = cooldown_seconds if cooldown_seconds is not None else settings.gemini_circuit_cooldown_seconds
            self._opened_until[model_name] = time.time() + cd
        elif status == CircuitStatus.CLOSED:
            self._opened_until.pop(model_name, None)

    def reset_all_circuits(self):
        """Restablece todos los circuitos al estado operativo normal (CLOSED)."""
        self._circuit_states.clear()
        self._opened_until.clear()

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
                logger.info(f"Invocando modelo '{model_name}' (Intento {idx + 1}/{len(models_cascade)})...", extra={"action": "llm_invoke_attempt", "model": model_name, "attempt": idx + 1})
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=gen_config
                )
                text = response.text or ""
                self._record_success(model_name)

                fallback_occurred = (model_name != primary_model)
                if fallback_occurred:
                    logger.info(f"Fallback exitoso: Petición resuelta por modelo de respaldo '{model_name}'.", extra={"action": "llm_fallback_success", "model": model_name, "primary_model": primary_model})


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

    def generate_stream(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2
    ):
        """
        Transmite progresivamente tokens en streaming atravesando la cascada de modelos con Circuit Breaker.
        Retorna un generador que emite fragmentos de texto en tiempo real para Server-Sent Events (SSE).
        """
        client = self._get_client()
        models_cascade = settings.get_models_cascade()
        config_kwargs: Dict[str, Any] = {"temperature": temperature}
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        gen_config = types.GenerateContentConfig(**config_kwargs)

        for idx, model_name in enumerate(models_cascade):
            if not self._is_model_available(model_name):
                continue

            try:
                logger.info(f"Invocando stream con '{model_name}' (Intento {idx + 1}/{len(models_cascade)})...", extra={"action": "llm_stream_attempt", "model": model_name, "attempt": idx + 1})
                response_stream = client.models.generate_content_stream(

                    model=model_name,
                    contents=prompt,
                    config=gen_config
                )

                def _stream_iterator():
                    try:
                        for chunk in response_stream:
                            if chunk.text:
                                yield chunk.text
                        self._record_success(model_name)
                    except Exception as stream_err:
                        self._record_failure(model_name, stream_err)
                        raise

                return _stream_iterator()

            except FatalLLMException:
                raise
            except Exception as err:
                self._record_failure(model_name, err)

        raise AllModelsExhaustedException("Todos los modelos de la cascada fallaron al iniciar streaming.")


# Singleton del Gateway para reutilización de estado del Circuit Breaker en todo el ciclo de vida del backend
llm_gateway = ResilientLLMGateway()
