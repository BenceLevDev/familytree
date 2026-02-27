import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

# Importáljuk a saját fájljainkat
from models import AppUser
from database import get_db

SECRET_KEY = os.getenv("SECRET_KEY", "ide-irj-egy-nagyon-hosszu-titkos-kodot-elesben")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 hétig érvényes

# MÓDOSÍTÁS: A bcrypt-et kiegészítjük, hogy kezelni tudja a 72 bájt feletti jelszavakat is
# A 'bcrypt_sha256' először SHA256-ot használ, így bármilyen hosszú jelszó belefér a bcrypt-be
pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def verify_password(plain_password, hashed_password):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Ha mégis pampogna a hossz miatt, itt elkapjuk, de a fenti séma ezt orvosolja
        return False

def get_password_hash(password):
    return pwd_context.hash(password)

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