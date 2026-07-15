from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    spotify_user_id = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)

    # Encrypted tokens
    access_token_encrypted = Column(String, nullable=False)
    refresh_token_encrypted = Column(String, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)

    created_at = Column(DateTime, default=func.now(), nullable=False)
    last_login_at = Column(DateTime, default=func.now(), nullable=False, onupdate=func.now())

    def __repr__(self):
        return f"<User {self.spotify_user_id}>"
