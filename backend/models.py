from sqlalchemy import Column, Integer, String, Text, ForeignKey
from database import Base

# --- ALAPADATOK ÉS A FA SZERKEZETE ---
class Member(Base):
    __tablename__ = "member"

    id = Column(Integer, primary_key=True, index=True)
    last_name = Column(String(100), nullable=False)
    first_name = Column(String(100), nullable=False)
    gender = Column(String(10))
    generation = Column(Integer)
    sort_order = Column(Integer, default=0)
    image_url = Column(String(255))
    komment = Column(Text)
    lakhely_tortenet = Column(Text)
    foglalkozas_tortenet = Column(Text)

class Relationship(Base):
    __tablename__ = "relationship"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(20), nullable=False)  # 'parent' vagy 'spouse'
    from_id = Column(Integer, ForeignKey('member.id'))
    to_id = Column(Integer, ForeignKey('member.id'))
    parent1_id = Column(Integer, ForeignKey('member.id'), nullable=True)
    parent2_id = Column(Integer, ForeignKey('member.id'), nullable=True)

# --- RÉSZLETES ADATOK (Sidebar) ---
class BirthData(Base):
    __tablename__ = "birth_data"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey('member.id'), unique=True)
    datum = Column(String(50))
    hely = Column(String(100))
    apa_nev = Column(String(100))
    anya_nev = Column(String(100))

class BaptismData(Base):
    __tablename__ = "baptism_data"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey('member.id'), unique=True)
    datum = Column(String(50))
    hely = Column(String(100))
    vallas = Column(String(150))
    keresztapa_nev = Column(String(100))
    keresztapa_foglalkozas = Column(String(100))
    keresztapa_lakhely = Column(String(150))
    keresztanya_nev = Column(String(100))
    keresztanya_foglalkozas = Column(String(100))
    keresztanya_lakhely = Column(String(150))
    keresztelo_szemely = Column(String(150))

class DeathData(Base):
    __tablename__ = "death_data"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey('member.id'), unique=True)
    datum = Column(String(50))
    hely = Column(String(100))
    ok = Column(String(255))
    bejelento = Column(String(100))

class MarriageData(Base):
    __tablename__ = "marriage_data"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey('member.id'))
    hazastars_nev = Column(String(100))
    hely = Column(String(100))
    ido = Column(String(50))
    tanu1_nev = Column(String(100))
    tanu1_foglalkozas = Column(String(100))
    tanu1_lakhely = Column(String(150))
    tanu2_nev = Column(String(100))
    tanu2_foglalkozas = Column(String(100))
    tanu2_lakhely = Column(String(150))

class Source(Base):
    __tablename__ = "source"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey('member.id'))
    label = Column(String(100))
    url = Column(String(255))

# --- ÚJ: FELHASZNÁLÓK AZ AUTHENTIKÁCIÓHOZ ---
class AppUser(Base):
    __tablename__ = "app_user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Integer, default=0) # 1 = admin (írhat), 0 = user (csak olvas)