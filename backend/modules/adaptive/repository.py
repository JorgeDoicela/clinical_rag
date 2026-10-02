import json
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from modules.adaptive.models import StudentMasteryModel, StudentSnapshotModel


class AdaptiveRepository:
    """
    Repositorio de persistencia relacional para estados psicométricos y trayectorias BKT.
    Aísla las consultas de base de datos del motor algorítmico adaptativo.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_mastery(self, user_id: str) -> Optional[Dict[str, float]]:
        record = self.db.query(StudentMasteryModel).filter(StudentMasteryModel.user_id == user_id).first()
        if not record or not record.state_json:
            return None
        try:
            return json.loads(record.state_json)
        except Exception:
            return None

    def save_mastery(self, user_id: str, state: Dict[str, float]) -> None:
        now = datetime.datetime.utcnow().isoformat()
        state_str = json.dumps(state, ensure_ascii=False)
        record = self.db.query(StudentMasteryModel).filter(StudentMasteryModel.user_id == user_id).first()
        if record:
            record.state_json = state_str
            record.updated_at = now
        else:
            record = StudentMasteryModel(
                user_id=user_id,
                state_json=state_str,
                updated_at=now
            )
            self.db.add(record)
        self.db.commit()

    def get_snapshots(self, user_id: str) -> List[Dict[str, Any]]:
        records = (
            self.db.query(StudentSnapshotModel)
            .filter(StudentSnapshotModel.user_id == user_id)
            .order_by(StudentSnapshotModel.session_num.asc())
            .all()
        )
        results = []
        for r in records:
            try:
                state = json.loads(r.state_json)
            except Exception:
                state = {}
            results.append({
                "session_num": r.session_num,
                "score_obtained": r.score_obtained,
                "state": state,
                "timestamp": r.timestamp
            })
        return results

    def add_snapshot(self, user_id: str, session_num: int, score: float, state: Dict[str, float]) -> None:
        now = datetime.datetime.utcnow().isoformat()
        record = StudentSnapshotModel(
            user_id=user_id,
            session_num=session_num,
            score_obtained=score,
            state_json=json.dumps(state, ensure_ascii=False),
            timestamp=now
        )
        self.db.add(record)
        self.db.commit()
