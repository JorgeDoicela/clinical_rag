from pathlib import Path
from typing import List, Optional
from core.config import settings, BASE_DIR
from models.schemas import ClinicalCaseSchema
from modules.cases.repository import CaseRepository


class CaseService:
    """
    Servicio de Dominio para Casos Clínicos y Estudios Paraclínicos.
    Provee la API pública del módulo cases hacia otros módulos y controladores.
    """
    def __init__(self, repository: CaseRepository):
        self.repository = repository
        self.images_base_dir = BASE_DIR / "cases_data" / "images"
        self.pdfs_base_dir = Path(settings.raw_pdfs_path)

    def list_cases(
        self,
        especialidad: Optional[str] = None,
        dificultad: Optional[str] = None
    ) -> List[ClinicalCaseSchema]:
        cases = self.repository.get_all()
        if especialidad:
            esp_lower = especialidad.lower()
            cases = [c for c in cases if getattr(c, "especialidad", None) and esp_lower in c.especialidad.lower()]
        if dificultad:
            dif_lower = dificultad.lower()
            cases = [c for c in cases if getattr(c, "dificultad", None) and dif_lower in c.dificultad.lower()]
        return cases

    def get_case(self, case_id: str) -> Optional[ClinicalCaseSchema]:
        return self.repository.get_by_id(case_id)

    def create_case(self, case: ClinicalCaseSchema, creado_por: Optional[str] = None) -> ClinicalCaseSchema:
        """Crea o actualiza un caso clínico en la base de datos relacional."""
        return self.repository.save_case(case, creado_por=creado_por)

    def delete_case(self, case_id: str) -> bool:
        """Elimina un caso clínico e invalida el caché."""
        return self.repository.delete_case(case_id)

    def invalidate_cache(self) -> None:
        """Fuerza la invalidación del caché de casos."""
        self.repository.invalidate_cache()

    def get_case_image_path(self, case_id: str, image_filename: str) -> Optional[Path]:
        img_path = self.images_base_dir / image_filename
        if img_path.exists() and img_path.is_file():
            return img_path
        return None

    def get_guide_pdf_path(self, pdf_filename: str) -> Optional[Path]:
        pdf_path = self.pdfs_base_dir / pdf_filename
        if pdf_path.exists() and pdf_path.is_file():
            return pdf_path
        return None
