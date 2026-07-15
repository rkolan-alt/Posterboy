from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Spotify OAuth
    spotify_client_id: str
    spotify_client_secret: str
    spotify_redirect_uri: str

    # Session & Security
    session_secret: str
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    # Frontend
    frontend_url: str

    # Database
    database_url: str

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
