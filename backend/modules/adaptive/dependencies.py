from modules.adaptive.service import AdaptiveCurriculumService

_adaptive_service_singleton = AdaptiveCurriculumService()


def get_adaptive_service() -> AdaptiveCurriculumService:
    return _adaptive_service_singleton
