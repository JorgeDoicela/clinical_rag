from abc import ABC, abstractmethod
from typing import Optional, Callable
from sqlalchemy.orm import Session
from core.database import SessionLocal
from modules.auth.repository import UserRepository, TenantRepository
from modules.cases.repository import CaseRepository
from modules.analytics_history.repository import HistoryRepository
from modules.adaptive.repository import AdaptiveRepository
from modules.collaboration.repository import RoomRepository


class AbstractUnitOfWork(ABC):
    """
    Contrato formal para el patrón Unit of Work (UoW).
    Garantiza atomicidad transaccional (ACID) y desacopla los servicios
    de la tecnología específica de persistencia.
    """
    tenants: TenantRepository
    users: UserRepository
    cases: CaseRepository
    history: HistoryRepository
    adaptive: AdaptiveRepository
    rooms: RoomRepository

    def __enter__(self) -> "AbstractUnitOfWork":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()

    @abstractmethod
    def commit(self) -> None:
        """Confirma todos los cambios acumulados en la transacción."""
        raise NotImplementedError

    @abstractmethod
    def rollback(self) -> None:
        """Revierte todos los cambios acumulados ante cualquier excepción."""
        raise NotImplementedError


class SqlAlchemyUnitOfWork(AbstractUnitOfWork):
    """
    Implementación concreta de Unit of Work sobre SQLAlchemy 2.0.
    Abre una sesión transaccional compartida y la inyecta en cada repositorio de dominio.
    Maneja commits explícitos, rollbacks automáticos y cierre seguro de conexiones.
    """
    def __init__(self, session_factory: Optional[Callable[[], Session]] = None):
        self.session_factory = session_factory or SessionLocal
        self.session: Optional[Session] = None

    def __enter__(self) -> "SqlAlchemyUnitOfWork":
        self.session = self.session_factory()
        self.tenants = TenantRepository(self.session)
        self.users = UserRepository(self.session)
        self.cases = CaseRepository(session=self.session)
        self.history = HistoryRepository(self.session)
        self.adaptive = AdaptiveRepository(self.session)
        self.rooms = RoomRepository(self.session)
        return self


    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is not None:
                self.rollback()
        finally:
            if self.session:
                self.session.close()

    def commit(self) -> None:
        if self.session:
            self.session.commit()

    def rollback(self) -> None:
        if self.session:
            self.session.rollback()


def get_uow() -> SqlAlchemyUnitOfWork:
    """Proveedor para inyección de dependencias en controladores o servicios FastAPI."""
    return SqlAlchemyUnitOfWork()
