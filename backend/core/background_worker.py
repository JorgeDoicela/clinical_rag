"""
Módulo de Despacho de Tareas Asíncronas en Segundo Plano (Ateneo+).
Desacopla operaciones intensivas en CPU (generación de PDFs ReportLab, hashing criptográfico SHA-256
y agregaciones analíticas de cohorte) del bucle de eventos de FastAPI mediante colas no bloqueantes
y un pool de trabajadores en hilos dedicados (ThreadPoolExecutor).
"""

import io
import time
import uuid
import datetime
import threading
import queue
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, Callable, List, Tuple
from concurrent.futures import ThreadPoolExecutor


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


@dataclass
class BackgroundTaskRecord:
    task_id: str
    task_type: str
    status: TaskStatus
    created_at: str
    filename: str = "reporte.pdf"
    media_type: str = "application/pdf"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    progress_percent: int = 0
    error: Optional[str] = None
    result_metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "task_type": self.task_type,
            "status": self.status.value,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "progress_percent": self.progress_percent,
            "filename": self.filename,
            "media_type": self.media_type,
            "error": self.error,
            "result_metadata": self.result_metadata,
        }


class BackgroundWorkerPool:
    """
    Gestor de cola y pool de trabajadores en hilos dedicados (ThreadPoolExecutor).
    Garantiza que el event loop de FastAPI nunca se bloquee por renderizado PDF o tareas CPU-bound.
    Totalmente agnóstico del event loop, operable de forma transparente tanto en endpoints asíncronos
    como síncronos y en entornos de pruebas multi-hilo.
    """
    def __init__(self, max_workers: int = 4):
        self._max_workers = max_workers
        self._tasks: Dict[str, BackgroundTaskRecord] = {}
        self._artifacts: Dict[str, bytes] = {}
        self._lock = threading.Lock()
        self._queue: queue.Queue = queue.Queue()
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="ateneo_pdf_worker")
        self._is_running = True
        self._dispatcher_thread = threading.Thread(
            target=self._dispatcher_loop,
            daemon=True,
            name="ateneo_task_dispatcher"
        )
        self._dispatcher_thread.start()

    def _dispatcher_loop(self):
        while self._is_running:
            try:
                item = self._queue.get(timeout=0.1)
            except queue.Empty:
                continue

            if item is None:
                break

            task_id, fn, args, kwargs = item
            self._executor.submit(self._execute_task, task_id, fn, args, kwargs)
            self._queue.task_done()

    def _execute_task(self, task_id: str, fn: Callable, args: tuple, kwargs: dict):
        with self._lock:
            record = self._tasks.get(task_id)
            if not record or record.status == TaskStatus.CANCELLED:
                return
            record.status = TaskStatus.PROCESSING
            record.started_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
            record.progress_percent = 25

        try:
            result = fn(*args, **kwargs)

            artifact_bytes: Optional[bytes] = None
            metadata: Dict[str, Any] = {}

            if isinstance(result, io.BytesIO):
                artifact_bytes = result.getvalue()
            elif isinstance(result, bytes):
                artifact_bytes = result
            elif isinstance(result, tuple) and len(result) == 2:
                buf, meta = result
                artifact_bytes = buf.getvalue() if isinstance(buf, io.BytesIO) else buf
                if isinstance(meta, dict):
                    metadata = meta
            elif isinstance(result, dict):
                metadata = result

            with self._lock:
                if artifact_bytes is not None:
                    self._artifacts[task_id] = artifact_bytes
                    metadata["size_bytes"] = len(artifact_bytes)

                record.status = TaskStatus.COMPLETED
                record.completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
                record.progress_percent = 100
                record.result_metadata = metadata

        except Exception as err:
            with self._lock:
                record.status = TaskStatus.FAILED
                record.completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
                record.error = str(err)

    async def submit_task(
        self,
        task_type: str,
        fn: Callable,
        *args,
        filename: str = "reporte.pdf",
        media_type: str = "application/pdf",
        **kwargs
    ) -> str:
        """Encola una tarea pesada de forma asíncrona no bloqueante."""
        return self.submit_task_sync(task_type, fn, *args, filename=filename, media_type=media_type, **kwargs)

    def submit_task_sync(
        self,
        task_type: str,
        fn: Callable,
        *args,
        filename: str = "reporte.pdf",
        media_type: str = "application/pdf",
        **kwargs
    ) -> str:
        """Encola una tarea pesada de forma síncrona thread-safe."""
        task_id = str(uuid.uuid4())
        record = BackgroundTaskRecord(
            task_id=task_id,
            task_type=task_type,
            status=TaskStatus.PENDING,
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            filename=filename,
            media_type=media_type
        )
        with self._lock:
            self._tasks[task_id] = record

        self._queue.put((task_id, fn, args, kwargs))
        return task_id

    def start(self):
        """Asegura que el despachador esté activo."""
        if not self._is_running or not self._dispatcher_thread.is_alive():
            self._is_running = True
            self._dispatcher_thread = threading.Thread(
                target=self._dispatcher_loop,
                daemon=True,
                name="ateneo_task_dispatcher"
            )
            self._dispatcher_thread.start()

    def get_task(self, task_id: str) -> Optional[BackgroundTaskRecord]:
        """Consulta el estado del registro de una tarea."""
        with self._lock:
            return self._tasks.get(task_id)

    def get_artifact(self, task_id: str) -> Optional[bytes]:
        """Obtiene el contenido binario producido por la tarea."""
        with self._lock:
            return self._artifacts.get(task_id)

    def cancel_task(self, task_id: str) -> bool:
        """Cancela una tarea pendiente si aún no ha iniciado procesamiento."""
        with self._lock:
            record = self._tasks.get(task_id)
            if record and record.status == TaskStatus.PENDING:
                record.status = TaskStatus.CANCELLED
                record.completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
                return True
            return False

    def list_tasks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retorna las tareas recientes registradas."""
        with self._lock:
            return [t.to_dict() for t in list(self._tasks.values())[-limit:]]

    def clear(self):
        """Limpia el almacén de tareas y artefactos (para pruebas)."""
        with self._lock:
            self._tasks.clear()
            self._artifacts.clear()

    def shutdown(self):
        """Detiene de forma ordenada el pool de trabajadores."""
        self._is_running = False
        self._queue.put(None)
        self._executor.shutdown(wait=False)


# Singleton del pool para uso transversal en routers
background_worker = BackgroundWorkerPool()
