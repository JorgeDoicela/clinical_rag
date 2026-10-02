"""
Batería de Pruebas Automatizadas de Gobernanza Multi-Tenancy y Aislamiento Institucional.
Certifica la segmentación estricta de identidades, casos, salas y analíticas por institución.
"""
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database import Base
from core.security import (
    create_access_token,
    decode_access_token,
    resolve_tenant_from_email_domain,
    get_password_hash
)
from core.unit_of_work import SqlAlchemyUnitOfWork
from models.schemas import User, UserRole, ClinicalCaseSchema
from modules.auth.models import TenantModel, UserModel
from modules.auth.repository import TenantRepository, UserRepository
from modules.analytics_history.models import EvaluationHistoryModel
from modules.analytics_history.repository import HistoryRepository
from modules.collaboration.models import AteneoRoomModel
from modules.collaboration.repository import RoomRepository
from modules.cases.models import ClinicalCaseModel
from modules.cases.repository import CaseRepository


@pytest.fixture
def test_db_session():
    """Genera una base de datos SQLite en memoria aislada con soporte para claves foráneas."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    # Sembrar tenant por defecto
    tenant_default = TenantModel(
        id="tenant_default",
        codigo="ateneo_central",
        nombre_institucional="Ateneo+ Sede Central (MSP Ecuador)",
        dominio_email="ateneo.edu.ec",
        gpc_activas_json="[]",
        activo=True
    )
    session.add(tenant_default)
    session.commit()

    try:
        yield session
    finally:
        session.close()


def test_tenant_creation_and_lookup(test_db_session):
    """Verifica el ciclo de vida y consultas de tenants en TenantRepository."""
    tenant_repo = TenantRepository(test_db_session)

    tenant_uce = TenantModel(
        id="tenant_uce",
        codigo="fac_med_uce",
        nombre_institucional="Facultad de Ciencias Médicas - Universidad Central del Ecuador",
        dominio_email="uce.edu.ec",
        gpc_activas_json='["GPC_Hipertension_Arterial_MSP_2019"]',
        activo=True
    )
    tenant_repo.create(tenant_uce)

    # Búsqueda por ID
    found_by_id = tenant_repo.get_by_id("tenant_uce")
    assert found_by_id is not None
    assert found_by_id.codigo == "fac_med_uce"
    assert found_by_id.dominio_email == "uce.edu.ec"

    # Búsqueda por código
    found_by_code = tenant_repo.get_by_codigo("fac_med_uce")
    assert found_by_code is not None
    assert found_by_code.id == "tenant_uce"

    # Búsqueda por dominio
    found_by_domain = tenant_repo.get_by_dominio("uce.edu.ec")
    assert found_by_domain is not None
    assert found_by_domain.nombre_institucional.startswith("Facultad de Ciencias Médicas")

    # Conteo total (default + uce = 2)
    assert tenant_repo.count() == 2


def test_tenant_resolution_and_jwt_claims():
    """Verifica que el token JWT incluya el claim de tenant_id y la resolución por dominio."""
    # Resolución por dominio conocido
    assert resolve_tenant_from_email_domain("docente@uce.edu.ec") == "tenant_uce"
    assert resolve_tenant_from_email_domain("estudiante@usfq.edu.ec") == "tenant_usfq"
    assert resolve_tenant_from_email_domain("auditor@msp.gob.ec") == "tenant_msp"
    assert resolve_tenant_from_email_domain("alumno@ateneo.edu.ec") == "tenant_default"
    assert resolve_tenant_from_email_domain("externo@gmail.com") == "tenant_default"

    # Emisión de token con tenant explícito
    user = User(
        id="usr_uce_001",
        email="docente.carlos@uce.edu.ec",
        nombre="Dr. Carlos UCE",
        rol=UserRole.DOCENTE,
        hashed_password="hash",
        activo=True,
        tenant_id="tenant_uce"
    )
    token = create_access_token(user)
    payload = decode_access_token(token)

    assert payload["sub"] == "docente.carlos@uce.edu.ec"
    assert payload["id"] == "usr_uce_001"
    assert payload["tenant_id"] == "tenant_uce"


def test_user_isolation_between_tenants(test_db_session):
    """Certifica que los usuarios queden estrictamente aislados por su tenant_id."""
    tenant_repo = TenantRepository(test_db_session)
    user_repo = UserRepository(test_db_session)

    # Crear dos tenants universitarios
    tenant_repo.create(TenantModel(
        id="tenant_uce",
        codigo="uce",
        nombre_institucional="Univ Central",
        dominio_email="uce.edu.ec",
        activo=True
    ))
    tenant_repo.create(TenantModel(
        id="tenant_usfq",
        codigo="usfq",
        nombre_institucional="Univ San Francisco",
        dominio_email="usfq.edu.ec",
        activo=True
    ))

    # Crear usuarios para UCE
    user_repo.create(UserModel(
        id="usr_uce_1",
        email="alumno1@uce.edu.ec",
        nombre="Estudiante UCE 1",
        rol="alumno",
        hashed_password=get_password_hash("Pass123!"),
        tenant_id="tenant_uce"
    ))
    user_repo.create(UserModel(
        id="usr_uce_2",
        email="alumno2@uce.edu.ec",
        nombre="Estudiante UCE 2",
        rol="alumno",
        hashed_password=get_password_hash("Pass123!"),
        tenant_id="tenant_uce"
    ))

    # Crear usuario para USFQ
    user_repo.create(UserModel(
        id="usr_usfq_1",
        email="alumno1@usfq.edu.ec",
        nombre="Estudiante USFQ 1",
        rol="alumno",
        hashed_password=get_password_hash("Pass123!"),
        tenant_id="tenant_usfq"
    ))

    # Consultas aisladas por tenant
    users_uce = user_repo.get_all(tenant_id="tenant_uce")
    users_usfq = user_repo.get_all(tenant_id="tenant_usfq")

    assert len(users_uce) == 2
    assert all(u.tenant_id == "tenant_uce" for u in users_uce)
    assert not any(u.id == "usr_usfq_1" for u in users_uce)

    assert len(users_usfq) == 1
    assert users_usfq[0].id == "usr_usfq_1"
    assert users_usfq[0].tenant_id == "tenant_usfq"

    # Conteo por tenant
    assert user_repo.count(tenant_id="tenant_uce") == 2
    assert user_repo.count(tenant_id="tenant_usfq") == 1


def test_history_and_cohort_analytics_isolation(test_db_session):
    """Certifica que las analíticas y evaluaciones de una facultad no contaminen los datos de otra."""
    tenant_repo = TenantRepository(test_db_session)
    user_repo = UserRepository(test_db_session)
    history_repo = HistoryRepository(test_db_session)

    # Crear instituciones
    tenant_repo.create(TenantModel(id="tenant_uce", codigo="uce", nombre_institucional="UCE", dominio_email="uce.edu.ec"))
    tenant_repo.create(TenantModel(id="tenant_usfq", codigo="usfq", nombre_institucional="USFQ", dominio_email="usfq.edu.ec"))

    # Crear usuarios asociados
    user_repo.create(UserModel(id="u_uce", email="u@uce.edu.ec", nombre="U UCE", rol="alumno", hashed_password="pwd", tenant_id="tenant_uce"))
    user_repo.create(UserModel(id="u_usfq", email="u@usfq.edu.ec", nombre="U USFQ", rol="alumno", hashed_password="pwd", tenant_id="tenant_usfq"))

    # Evaluaciones para UCE (score promedio: 9.0)
    history_repo.create(EvaluationHistoryModel(
        user_id="u_uce",
        user_email="u@uce.edu.ec",
        case_id="case_1",
        guia_asociada="gpc_dengue",
        case_title="Dengue UCE",
        score=9.0,
        score_max=10,
        faithfulness_score=0.95,
        cohorte_id="cohorte_2026_a",
        tiempo_segundos=120.0,
        tenant_id="tenant_uce"
    ))

    # Evaluaciones para USFQ (score promedio: 6.0)
    history_repo.create(EvaluationHistoryModel(
        user_id="u_usfq",
        user_email="u@usfq.edu.ec",
        case_id="case_2",
        guia_asociada="gpc_neumonia",
        case_title="Neumonía USFQ",
        score=6.0,
        score_max=10,
        faithfulness_score=0.75,
        cohorte_id="cohorte_2026_a",
        tiempo_segundos=240.0,
        tenant_id="tenant_usfq"
    ))

    # Auditoría de métricas de cohorte UCE
    stats_uce = history_repo.get_cohort_summary_stats(tenant_id="tenant_uce")
    assert stats_uce["total_evaluaciones"] == 1
    assert stats_uce["total_estudiantes"] == 1
    assert stats_uce["promedio_score"] == 9.0
    assert stats_uce["promedio_faithfulness"] == 0.95
    assert stats_uce["promedio_tiempo_segundos"] == 120.0

    # Auditoría de métricas de cohorte USFQ
    stats_usfq = history_repo.get_cohort_summary_stats(tenant_id="tenant_usfq")
    assert stats_usfq["total_evaluaciones"] == 1
    assert stats_usfq["total_estudiantes"] == 1
    assert stats_usfq["promedio_score"] == 6.0
    assert stats_usfq["promedio_faithfulness"] == 0.75
    assert stats_usfq["promedio_tiempo_segundos"] == 240.0

    # Auditoría de desglose por guía en UCE
    breakdown_uce = history_repo.get_guide_breakdown_stats(tenant_id="tenant_uce")
    assert len(breakdown_uce) == 1
    assert breakdown_uce[0]["guia_asociada"] == "gpc_dengue"

    # Auditoría de listado completo de evaluaciones aisladas
    evals_uce = history_repo.get_all(tenant_id="tenant_uce")
    assert len(evals_uce) == 1
    assert evals_uce[0].tenant_id == "tenant_uce"
    assert evals_uce[0].case_title == "Dengue UCE"


def test_room_collaboration_isolation(test_db_session):
    """Certifica que las salas colaborativas estén estrictamente aisladas por tenant."""
    tenant_repo = TenantRepository(test_db_session)
    user_repo = UserRepository(test_db_session)
    room_repo = RoomRepository(test_db_session)

    tenant_repo.create(TenantModel(id="tenant_uce", codigo="uce", nombre_institucional="UCE", dominio_email="uce.edu.ec"))
    tenant_repo.create(TenantModel(id="tenant_usfq", codigo="usfq", nombre_institucional="USFQ", dominio_email="usfq.edu.ec"))

    user_repo.create(UserModel(id="doc_uce", email="doc@uce.edu.ec", nombre="Doc UCE", rol="docente", hashed_password="pwd", tenant_id="tenant_uce"))
    user_repo.create(UserModel(id="doc_usfq", email="doc@usfq.edu.ec", nombre="Doc USFQ", rol="docente", hashed_password="pwd", tenant_id="tenant_usfq"))

    # Sala UCE
    room_repo.save(AteneoRoomModel(
        room_code="UCE-01",
        case_id="case_1",
        docente_id="doc_uce",
        docente_nombre="Doc UCE",
        estado="espera",
        tenant_id="tenant_uce"
    ))

    # Sala USFQ
    room_repo.save(AteneoRoomModel(
        room_code="USFQ-01",
        case_id="case_2",
        docente_id="doc_usfq",
        docente_nombre="Doc USFQ",
        estado="discusion",
        tenant_id="tenant_usfq"
    ))

    # Consultar salas activas para UCE
    active_uce = room_repo.get_active_rooms(tenant_id="tenant_uce")
    assert len(active_uce) == 1
    assert active_uce[0].room_code == "UCE-01"
    assert active_uce[0].tenant_id == "tenant_uce"

    # Consultar salas activas para USFQ
    active_usfq = room_repo.get_active_rooms(tenant_id="tenant_usfq")
    assert len(active_usfq) == 1
    assert active_usfq[0].room_code == "USFQ-01"
    assert active_usfq[0].tenant_id == "tenant_usfq"


def test_case_repository_tenant_isolation(test_db_session):
    """Verifica que los casos clínicos dinámicos se segmenten adecuadamente por tenant."""
    tenant_repo = TenantRepository(test_db_session)
    user_repo = UserRepository(test_db_session)
    case_repo = CaseRepository(session=test_db_session)

    tenant_repo.create(TenantModel(id="tenant_uce", codigo="uce", nombre_institucional="UCE", dominio_email="uce.edu.ec"))
    user_repo.create(UserModel(id="doc_uce", email="doc@uce.edu.ec", nombre="Doc UCE", rol="docente", hashed_password="pwd", tenant_id="tenant_uce"))

    # Guardar caso específico para UCE
    caso_uce = ClinicalCaseSchema(
        id="case_dinamico_uce_01",
        guia_asociada="gpc_trauma_msp",
        titulo="Trauma Torácico - Simulación UCE",
        enunciado="Paciente con trauma cerrado de tórax...",
        pregunta="¿Cuál es la conducta inicial prioritaria?",
        tenant_id="tenant_uce"
    )
    case_repo.save_case(caso_uce, creado_por="doc_uce", tenant_id="tenant_uce")

    # Caso consultado por UCE debe existir
    caso_recuperado = case_repo.get_by_id("case_dinamico_uce_01", tenant_id="tenant_uce")
    assert caso_recuperado is not None
    assert caso_recuperado.titulo == "Trauma Torácico - Simulación UCE"
    assert caso_recuperado.tenant_id == "tenant_uce"


def test_unit_of_work_tenant_management():
    """Certifica que Unit of Work gestione TenantRepository con atomicidad ACID."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    uow = SqlAlchemyUnitOfWork(session_factory=session_factory)

    # 1. Commit exitoso
    with uow:
        tenant = TenantModel(
            id="tenant_test_uow",
            codigo="test_uow",
            nombre_institucional="Institución Test UoW",
            dominio_email="test.uow.ec",
            activo=True
        )
        uow.tenants.create(tenant, commit=False)
        uow.commit()

    with uow:
        retrieved = uow.tenants.get_by_id("tenant_test_uow")
        assert retrieved is not None
        assert retrieved.codigo == "test_uow"

    # 2. Rollback automático ante error
    try:
        with uow:
            bad_tenant = TenantModel(
                id="tenant_rollback",
                codigo="rollback",
                nombre_institucional="Rollback Test",
                dominio_email="rollback.ec",
                activo=True
            )
            uow.tenants.create(bad_tenant, commit=False)
            raise RuntimeError("Fallo simulado para forzar rollback")
    except RuntimeError:
        pass

    with uow:
        assert uow.tenants.get_by_id("tenant_rollback") is None

