from modules.cases.repository import CaseRepository
from modules.cases.service import CaseService

_case_repo_singleton = CaseRepository()
_case_service_singleton = CaseService(_case_repo_singleton)


def get_case_repository() -> CaseRepository:
    return _case_repo_singleton


def get_case_service() -> CaseService:
    return _case_service_singleton
