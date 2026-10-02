from modules.auth.service import AuthService

_auth_service_singleton = AuthService()


def get_auth_service() -> AuthService:
    return _auth_service_singleton
