from fastapi import Depends
from modules.cases.dependencies import get_case_service
from modules.cases.service import CaseService
from modules.analytics_history.dependencies import get_analytics_service
from modules.analytics_history.service import AnalyticsHistoryService
from modules.evaluation.service import EvaluationService


from modules.adaptive.dependencies import get_adaptive_service
from modules.adaptive.service import AdaptiveCurriculumService


def get_evaluation_service(
    case_service: CaseService = Depends(get_case_service),
    analytics_service: AnalyticsHistoryService = Depends(get_analytics_service),
    adaptive_service: AdaptiveCurriculumService = Depends(get_adaptive_service)
) -> EvaluationService:
    return EvaluationService(
        case_service=case_service,
        analytics_service=analytics_service,
        adaptive_service=adaptive_service
    )

