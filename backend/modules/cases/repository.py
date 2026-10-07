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

    def _load_from_db(self, tenant_id: Optional[str] = None) -> List[ClinicalCaseSchema]:
        def _query_db(db: Session) -> List[ClinicalCaseSchema]:
            query = db.query(ClinicalCaseModel)
            if tenant_id:
                query = query.filter(
                    (ClinicalCaseModel.tenant_id == tenant_id) |
                    (ClinicalCaseModel.tenant_id == "tenant_default") |
                    (ClinicalCaseModel.tenant_id.is_(None))
                )
            db_cases = query.all()
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
                    competencias_activadas=row.competencias_activadas,
                    tenant_id=getattr(row, "tenant_id", "tenant_default") or "tenant_default"
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

    def get_all(
        self,
        reload: bool = False,
        tenant_id: Optional[str] = None,
        include_inactive: bool = False
    ) -> List[ClinicalCaseSchema]:
        if self._cache is not None and not reload and tenant_id is None:
            results = self._cache
        else:
            # 1. Cargar casos canónicos de JSON
            json_cases = self._load_from_json()
            cases_map = {c.id: c for c in json_cases}

            # 2. Cargar y sobreescribir/extender con casos dinámicos de BD
            db_cases = self._load_from_db(tenant_id=tenant_id)
            for c in db_cases:
                cases_map[c.id] = c

            results = list(cases_map.values())
            if tenant_id is None:
                self._cache = results

        if not include_inactive:
            return [c for c in results if getattr(c, "activo", True) is not False]
        return results

    def get_by_id(self, case_id: str, tenant_id: Optional[str] = None) -> Optional[ClinicalCaseSchema]:
        cases = self.get_all(tenant_id=tenant_id)
        for c in cases:
            if c.id == case_id:
                return c
        return None

    def save_case(
        self,
        case: ClinicalCaseSchema,
        creado_por: Optional[str] = None,
        tenant_id: Optional[str] = None
    ) -> ClinicalCaseSchema:
        """Persiste un caso clínico en la base de datos relacional e invalida el caché."""
        fases_dump = [f.model_dump() if hasattr(f, "model_dump") else f for f in (case.fases or [])]
        resolved_tenant = tenant_id or getattr(case, "tenant_id", "tenant_default") or "tenant_default"
        
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
                db_case.tenant_id = resolved_tenant
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
                    creado_por=creado_por,
                    tenant_id=resolved_tenant
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

    def invalidate_cache(self) -> None:
        """Invalida el caché en memoria para forzar recarga desde JSON y BD."""
        self._cache = None

    def delete_case(self, case_id: str) -> bool:
        """Elimina un caso clínico de la base de datos e invalida el caché en memoria."""
        def _delete(db: Session) -> bool:
            deleted = db.query(ClinicalCaseModel).filter(ClinicalCaseModel.id == case_id).delete()
            db.commit()
            return deleted > 0

        res = False
        if self.session is not None:
            res = _delete(self.session)
        else:
            with get_db_context() as db:
                res = _delete(db)

        self._cache = None
        return res
