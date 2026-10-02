from typing import List, Optional
from sqlalchemy.orm import Session
from modules.collaboration.models import AteneoRoomModel


class RoomRepository:
    """
    Repositorio de persistencia relacional para salas de Ateneo sincrónico.
    Aísla las operaciones CRUD de base de datos del servicio de colaboración.
    """
    def __init__(self, db: Session):
        self.db = db

    def get(self, room_code: str) -> Optional[AteneoRoomModel]:
        return self.db.query(AteneoRoomModel).filter(AteneoRoomModel.room_code == room_code).first()

    def get_all(self) -> List[AteneoRoomModel]:
        return self.db.query(AteneoRoomModel).all()

    def count(self) -> int:
        return self.db.query(AteneoRoomModel).count()

    def save(self, record: AteneoRoomModel) -> AteneoRoomModel:
        existing = self.get(record.room_code)
        if existing:
            existing.case_id = record.case_id
            existing.docente_id = record.docente_id
            existing.docente_nombre = record.docente_nombre
            existing.estado = record.estado
            existing.data_json = record.data_json
            existing.updated_at = record.updated_at
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
