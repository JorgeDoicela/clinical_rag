"""
Repositorio Híbrido de Casos Clínicos (JSON Canónico + SQLAlchemy Relacional).
Combina los casos normativos fundacionales en JSON con casos dinámicos
creados por docentes en la base de datos relacional.
"""
import json
import logging
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from core.config import settings
from core.database import get_db_context
from models.schemas import ClinicalCaseSchema
from modules.cases.models import ClinicalCaseModel

logger = logging.getLogger(__name__)


class CaseRepository:
    """
    Repositorio de Casos Clínicos con persistencia híbrida:
    1. Carga casos canónicos estables desde el archivo JSON de casos GPC.
    2. Carga y combina casos dinámicos creados institucionalmente desde SQLite/PostgreSQL.
    """
    def __init__(self, cases_file_path: Optional[str] = None, session: Optional[Session] = None):
        self.cases_file_path = Path(cases_file_path or settings.cases_file_path)
        self.session = session
        self._cache: Optional[List[ClinicalCaseSchema]] = None

    def _load_from_json(self) -> List[ClinicalCaseSchema]:
        if not self.cases_file_path.exists():
            return []
        try:
            with open(self.cases_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [ClinicalCaseSchema(**item) for item in data.get("cases", [])]
        except Exception as e:
            logger.error("Error al leer archivo canónico de casos clínicos: %s", e)
            return []

    def _load_from_db(self) -> List[ClinicalCaseSchema]:
        def _query_db(db: Session) -> List[ClinicalCaseSchema]:
            db_cases = db.query(ClinicalCaseModel).all()
            result = []
            for row in db_cases:
                result.append(ClinicalCaseSchema(
                    id=row.id,
                    guia_asociada=row.guia_asociada,
                    titulo=row.titulo,
                    enunciado=row.enunciado,
                    pregunta=row.pregunta,
                    imagen_url=row.imagen_url,
                    nivel_esperado=row.nivel_esperado or "pregrado_avanzado",
                    fragmento_gpc_ideal_id=row.fragmento_gpc_ideal_id,
                    modo_simulacion=row.modo_simulacion or "single_turn",
                    fases=row.fases,
                    competencias_activadas=row.competencias_activadas
                ))
            return result

        if self.session is not None:
            return _query_db(self.session)
        else:
            try:
                with get_db_context() as db:
                    return _query_db(db)
            except Exception as e:
                logger.warning("Base de datos no disponible para casos dinámicos: %s", e)
                return []

    def get_all(self, reload: bool = False) -> List[ClinicalCaseSchema]:
        if self._cache is not None and not reload:
            return self._cache

        # 1. Cargar casos canónicos de JSON
        json_cases = self._load_from_json()
        cases_map = {c.id: c for c in json_cases}

        # 2. Cargar y sobreescribir/extender con casos dinámicos de BD
        db_cases = self._load_from_db()
        for c in db_cases:
            cases_map[c.id] = c

        self._cache = list(cases_map.values())
        return self._cache

    def get_by_id(self, case_id: str) -> Optional[ClinicalCaseSchema]:
        cases = self.get_all()
        for c in cases:
            if c.id == case_id:
                return c
        return None

    def save_case(self, case: ClinicalCaseSchema, creado_por: Optional[str] = None) -> ClinicalCaseSchema:
        """Persiste un caso clínico en la base de datos relacional e invalida el caché."""
        fases_dump = [f.model_dump() if hasattr(f, "model_dump") else f for f in (case.fases or [])]
        
        def _persist(db: Session):
            db_case = db.query(ClinicalCaseModel).filter(ClinicalCaseModel.id == case.id).first()
            if db_case:
                db_case.guia_asociada = case.guia_asociada
                db_case.titulo = case.titulo
                db_case.enunciado = case.enunciado
                db_case.pregunta = case.pregunta
                db_case.imagen_url = case.imagen_url
                db_case.nivel_esperado = case.nivel_esperado
                db_case.fragmento_gpc_ideal_id = case.fragmento_gpc_ideal_id
                db_case.modo_simulacion = case.modo_simulacion
                db_case.fases = fases_dump
                db_case.competencias_activadas = case.competencias_activadas
                if creado_por:
                    db_case.creado_por = creado_por
            else:
                db_case = ClinicalCaseModel(
                    id=case.id,
                    guia_asociada=case.guia_asociada,
                    titulo=case.titulo,
                    enunciado=case.enunciado,
                    pregunta=case.pregunta,
                    imagen_url=case.imagen_url,
                    nivel_esperado=case.nivel_esperado,
                    fragmento_gpc_ideal_id=case.fragmento_gpc_ideal_id,
                    modo_simulacion=case.modo_simulacion,
                    fases=fases_dump,
                    competencias_activadas=case.competencias_activadas,
                    creado_por=creado_por
                )
                db.add(db_case)
            db.commit()

        if self.session is not None:
            _persist(self.session)
        else:
            with get_db_context() as db:
                _persist(db)

        # Invalidar caché en memoria
        self._cache = None
        return case
