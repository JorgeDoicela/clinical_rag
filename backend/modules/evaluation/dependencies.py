from fastapi import Depends
from modules.cases.dependencies import get_case_service
from modules.cases.service import CaseService
from modules.analytics_history.dependencies import get_analytics_service
from modules.analytics_history.service import AnalyticsHistoryService
from modules.evaluation.service import EvaluationService


def get_evaluation_service(
    case_service: CaseService = Depends(get_case_service),
    analytics_service: AnalyticsHistoryService = Depends(get_analytics_service)
) -> EvaluationService:
    return EvaluationService(case_service=case_service, analytics_service=analytics_service)
