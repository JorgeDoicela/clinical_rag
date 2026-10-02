from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from modules.collaboration.models import AteneoRoomModel


class RoomRepository:
    """
    Repositorio de persistencia relacional para salas de Ateneo sincrónico.
    Aísla las operaciones CRUD de base de datos del servicio de colaboración
    y gestiona marcas temporales con precisión horaria en servidor.
    """
    def __init__(self, db: Session):
        self.db = db

    def get(self, room_code: str) -> Optional[AteneoRoomModel]:
        return self.db.query(AteneoRoomModel).filter(AteneoRoomModel.room_code == room_code).first()

    def get_all(self, tenant_id: Optional[str] = None) -> List[AteneoRoomModel]:
        query = self.db.query(AteneoRoomModel)
        if tenant_id:
            query = query.filter(AteneoRoomModel.tenant_id == tenant_id)
        return query.order_by(AteneoRoomModel.updated_at.desc()).all()

    def get_active_rooms(self, tenant_id: Optional[str] = None) -> List[AteneoRoomModel]:
        """Retorna las salas activas en estado de espera o discusión clínica, con filtro opcional por tenant."""
        query = self.db.query(AteneoRoomModel).filter(AteneoRoomModel.estado.in_(["espera", "discusion"]))
        if tenant_id:
            query = query.filter(AteneoRoomModel.tenant_id == tenant_id)
        return query.order_by(AteneoRoomModel.updated_at.desc()).all()

    def get_by_docente(self, docente_id: str, tenant_id: Optional[str] = None) -> List[AteneoRoomModel]:
        """Retorna las salas creadas o moderadas por un docente específico."""
        query = self.db.query(AteneoRoomModel).filter(AteneoRoomModel.docente_id == docente_id)
        if tenant_id:
            query = query.filter(AteneoRoomModel.tenant_id == tenant_id)
        return query.order_by(AteneoRoomModel.created_at.desc()).all()

    def count(self, tenant_id: Optional[str] = None) -> int:
        query = self.db.query(AteneoRoomModel)
        if tenant_id:
            query = query.filter(AteneoRoomModel.tenant_id == tenant_id)
        return query.count()

    def save(self, record: AteneoRoomModel) -> AteneoRoomModel:
        existing = self.get(record.room_code)
        if existing:
            existing.case_id = record.case_id
            existing.docente_id = record.docente_id
            existing.docente_nombre = record.docente_nombre
            existing.estado = record.estado
            existing.data_json = record.data_json
            if getattr(record, "tenant_id", None):
                existing.tenant_id = record.tenant_id
            existing.updated_at = record.updated_at or func.now()
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            self.db.add(record)
            self.db.commit()
            self.db.refresh(record)
            return record


    def delete(self, room_code: str) -> bool:
        record = self.get(room_code)
        if record:
            self.db.delete(record)
            self.db.commit()
            return True
        return False
