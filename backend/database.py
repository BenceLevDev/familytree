import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Környezeti változóból olvassuk be az URL-t, ha nincs, akkor marad a helyi SQLite
SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///family.db')

# Ingyenes felhős adatbázisok sokszor 'postgres://'-t adnak, 
# de a SQLAlchemy 'postgresql://'-t vár, ezt javítjuk automatikusan:
if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)

# A check_same_thread=False CSAK SQLite-hoz kell, PostgreSQL-nél hibát okozna
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URI.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URI, connect_args=connect_args
)

# Ez a Session osztály, ebből példányosítjuk az adatbázis kapcsolatokat
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ebből az osztályból fognak öröklődni a modellek (models.py)
Base = declarative_base()

# Ide került a Dependency, hogy mindenhol elérhető legyen ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()