from typing import List, Optional, Union
from pydantic import BaseModel, Field

# --- KIFELÉ MENŐ ADATOK (Response Sémák) ---

class MemberListSchema(BaseModel):
    id: int
    last_name: Optional[str]
    first_name: Optional[str]
    gender: Optional[str]
    generation: Optional[int]
    image_url: Optional[str]
    sort_order: Optional[int]

    class Config:
        from_attributes = True 

class RelationshipSchema(BaseModel):
    type: Optional[str]
    from_id: Optional[int] = Field(default=None, alias="from")
    to_id: Optional[int] = Field(default=None, alias="to")
    parent1id: Optional[int] = None
    parent2id: Optional[int] = None

    class Config:
        from_attributes = True
        populate_by_name = True 

class TreeDataResponse(BaseModel):
    members: List[MemberListSchema]
    relationships: List[RelationshipSchema]

# --- RÉSZLETES ADATOK ALMODELLEI ---

class PersonInfo(BaseModel):
    nev: Optional[str] = None
    foglalk: Optional[str] = None
    lakhely: Optional[str] = None

class EventData(BaseModel):
    datum: Optional[str] = None
    hely: Optional[str] = None

class BirthDetail(EventData):
    apa: Optional[str] = None
    anya: Optional[str] = None

class BaptismDetail(EventData):
    vallas: Optional[str] = None
    keresztelo_szemely: Optional[str] = None
    keresztapa: Optional[PersonInfo] = None
    keresztanya: Optional[PersonInfo] = None

class DeathDetail(EventData):
    ok: Optional[str] = None
    bejelento: Optional[str] = None

class MarriageDetail(BaseModel):
    hazastars: Optional[str] = None
    spouse_id: Optional[Union[int, str]] = None
    hely: Optional[str] = None
    datum: Optional[str] = None
    tanu1: Optional[PersonInfo] = None
    tanu2: Optional[PersonInfo] = None

class SourceDetail(BaseModel):
    label: Optional[str] = None
    url: Optional[str] = None

class MemberDetailResponse(BaseModel):
    id: int
    last_name: Optional[str]
    first_name: Optional[str]
    gender: Optional[str]
    komment: Optional[str]
    lakhely: Optional[str]
    foglalkozas: Optional[str]
    birth: Optional[BirthDetail] = None
    baptism: Optional[BaptismDetail] = None
    death: Optional[DeathDetail] = None
    marriages: List[MarriageDetail] = []
    sources: List[SourceDetail] = []
    sort_order: Optional[int] = None

# --- BEFELÉ JÖVŐ ADATOK (Létrehozás és Frissítés) ---

class MemberCreation(BaseModel):
    id: Optional[int] = None
    last_name: str
    first_name: str
    gender: Optional[str] = None
    generation: Optional[int] = 1
    komment: Optional[str] = None
    lakhely: Optional[str] = None
    foglalkozas: Optional[str] = None

    father_id: Optional[Union[int, str]] = None
    mother_id: Optional[Union[int, str]] = None

    birth: Optional[BirthDetail] = None
    baptism: Optional[BaptismDetail] = None
    death: Optional[DeathDetail] = None
    marriages: List[MarriageDetail] = []
    sources: List[SourceDetail] = []
    sort_order: Optional[int] = None

    class Config:
        from_attributes = True

class BirthUpdate(BaseModel):
    datum: Optional[str] = None
    hely: Optional[str] = None
    apa_nev: Optional[str] = None
    anya_nev: Optional[str] = None

class DeathUpdate(BaseModel):
    datum: Optional[str] = None
    hely: Optional[str] = None
    ok: Optional[str] = None
    bejelento: Optional[str] = None

class WitnessUpdate(BaseModel):
    nev: Optional[str] = None
    lakhely: Optional[str] = None
    foglalk: Optional[str] = None

class BaptismUpdate(BaseModel):
    datum: Optional[str] = None
    hely: Optional[str] = None
    vallas: Optional[str] = None
    keresztelo_szemely: Optional[str] = None
    keresztapa: Optional[WitnessUpdate] = None 
    keresztanya: Optional[WitnessUpdate] = None

class MarriageUpdate(BaseModel):
    hazastars: Optional[str] = None
    spouse_id: Optional[Union[int, str]] = None
    datum: Optional[str] = None
    hely: Optional[str] = None
    tanu1: Optional[WitnessUpdate] = None
    tanu2: Optional[WitnessUpdate] = None

class SourceUpdate(BaseModel):
    label: Optional[str] = None
    url: Optional[str] = None

class MemberUpdateSchema(BaseModel):
    last_name: Optional[str] = None
    first_name: Optional[str] = None
    foglalkozas: Optional[str] = None
    lakhely: Optional[str] = None
    komment: Optional[str] = None
    
    sort_order: Optional[Union[str, int]] = None
    
    father_id: Optional[Union[int, str]] = None
    mother_id: Optional[Union[int, str]] = None

    birth: Optional[BirthUpdate] = None
    baptism: Optional[BaptismUpdate] = None
    death: Optional[DeathUpdate] = None
    marriages: List[MarriageUpdate] = []
    sources: List[SourceUpdate] = []

    class Config:
        from_attributes = True

# --- KERESÉS SÉMÁJA ---

class MemberSearchSchema(BaseModel):
    id: int
    full_name: str
    birth_year: Optional[str] = None
    gender: str

    class Config:
        from_attributes = True

# --- User létrehozása ---
class UserCreateSchema(BaseModel):
    username: str
    password: str
    is_admin: int = 0