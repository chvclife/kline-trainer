# server/app/services/auth_service.py
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

security_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain.encode("utf-8"), hashed.encode("utf-8")
    )


def create_access_token(user_id: str) -> str:
    """Create a JWT access token with short expiry (default 30 min)."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm="HS256"
    )


def create_refresh_token(user_id: str) -> str:
    """Create a JWT refresh token with longer expiry (default 7 days)."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm="HS256"
    )


def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT token. Returns payload or None."""
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=["HS256"]
        )
    except JWTError:
        return None


def get_user_by_username(db: Session, username: str) -> User | None:
    """Retrieve a user by username."""
    return db.query(User).filter(User.username == username).first()


def create_user(db: Session, username: str, password: str) -> User:
    """Create a new user with hashed password."""
    user = User(
        username=username,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(
    db: Session, username: str, password: str
) -> User | None:
    """Authenticate a user by username and password. Returns user or None."""
    user = get_user_by_username(db, username)
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency: extracts and validates the current user from JWT."""
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user