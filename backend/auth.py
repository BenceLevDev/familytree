import os
import jwt
import bcrypt
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

# Importáljuk a saját fájljainkat
from models import AppUser
from database import get_db

SECRET_KEY = os.getenv("SECRET_KEY", "ide-irj-egy-nagyon-hosszu-titkos-kodot-elesben")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 hétig érvényes

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def _prepare_password(password: str) -> bytes:
    """
    Segédfüggvény: SHA256-al előkészíti a jelszót, hogy 
    soha ne lépje át a bcrypt 72 bájtos korlátját.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Ellenőrzi a jelszót. Kezeli a régi típusú és az új, 
    SHA256-al előkészített jelszavakat is.
    """
    try:
        # 1. Próbálkozás: Az új, biztonságosabb (SHA256 + bcrypt) módszerrel
        prepared_password = _prepare_password(plain_password)
        if bcrypt.checkpw(prepared_password, hashed_password.encode("utf-8")):
            return True
    except Exception:
        pass

    try:
        # 2. Próbálkozás: A régi, sima bcrypt módszerrel (a migrált adatokhoz)
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """
    Létrehozza a jelszó hash-ét az új, biztonságos módszerrel.
    """
    prepared_password = _prepare_password(password)
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(prepared_password, salt)
    return hashed.decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Érvénytelen azonosító adatok",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="A token lejárt")
    except jwt.InvalidTokenError:
        raise credentials_exception
        
    user = db.query(AppUser).filter(AppUser.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin_user(current_user: AppUser = Depends(get_current_user)):
    if current_user.is_admin != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a szerkesztéshez! Csak olvasási jogod van.")
    return current_user