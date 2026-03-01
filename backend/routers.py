from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc, func
from typing import List
from datetime import timedelta
from fastapi.security import OAuth2PasswordRequestForm

# Importáljuk a szétbontott moduljainkat
from database import get_db
from models import Member, Relationship, BirthData, BaptismData, DeathData, MarriageData, Source, AppUser
from schemas import (
    TreeDataResponse, 
    MemberCreation, 
    MemberUpdateSchema, 
    MemberDetailResponse, 
    MemberSearchSchema,
    UserCreateSchema
)
import auth

# Létrehozzuk a router példányt
router = APIRouter()

# --- API Végpontok ---

# Login végpont a token kikéréséhez
@router.post("/api/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(AppUser).filter(AppUser.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Hibás felhasználónév vagy jelszó",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "is_admin": user.is_admin == 1}

@router.post('/api/users/register')
def create_new_user(user_data: UserCreateSchema, db: Session = Depends(get_db), current_user: AppUser = Depends(auth.get_current_admin_user)):
    existing_user = db.query(AppUser).filter(AppUser.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Ez a felhasználónév már foglalt.")
    
    hashed_password = auth.get_password_hash(user_data.password)
    
    new_user = AppUser(
        username=user_data.username,
        hashed_password=hashed_password,
        is_admin=user_data.is_admin
    )
    
    db.add(new_user)
    db.commit()
    
    return {"message": "Sikeresen létrehozva!"}
# Védve: Bármilyen bejelentkezett felhasználó olvashatja
@router.get('/api/data', response_model=TreeDataResponse)
def get_tree_data(db: Session = Depends(get_db), current_user: AppUser = Depends(auth.get_current_user)):
    members = db.query(Member).order_by(asc(Member.generation), asc(Member.sort_order)).all()
    rels = db.query(Relationship).all()
    
    relationships_list = [
        {
            "type": r.type,
            "from": r.from_id,
            "to": r.to_id,
            "parent1id": r.parent1_id,
            "parent2id": r.parent2_id
        } for r in rels
    ]

    return {
        "members": members,
        "relationships": relationships_list
    }

# Védve: Csak ADMIN hozhat létre újat
@router.post('/api/member')
def create_member(member_data: MemberCreation, db: Session = Depends(get_db), current_user: AppUser = Depends(auth.get_current_admin_user)):
    if member_data.id is None:
        max_id = db.query(func.max(Member.id)).scalar()
        new_id = (max_id + 1) if max_id is not None else 1
    else:
        new_id = member_data.id

    existing = db.query(Member).filter(Member.id == new_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Member with this ID already exists.") 
    
    new_member = Member(
        id=new_id,
        last_name=member_data.last_name,
        first_name=member_data.first_name,
        gender=member_data.gender,
        generation=member_data.generation,
        sort_order=member_data.sort_order if member_data.sort_order is not None else new_id,
        komment=member_data.komment,
        lakhely_tortenet=member_data.lakhely,
        foglalkozas_tortenet=member_data.foglalkozas
    )
    db.add(new_member)
    db.flush()

    def clean_id(val):
        if val == "" or val is None: return None
        return int(val)

    father_id = clean_id(member_data.father_id)
    mother_id = clean_id(member_data.mother_id)

    if father_id or mother_id:
        active_parent_id = father_id if father_id else mother_id
        
        new_rel = Relationship(
            type="parent",
            from_id=active_parent_id,
            to_id=new_id,
            parent1_id=father_id,
            parent2_id=mother_id
        )
        db.add(new_rel)

    if member_data.birth:
        db.add(BirthData(
            member_id=new_id,
            datum=member_data.birth.datum,
            hely=member_data.birth.hely,
            apa_nev=member_data.birth.apa,
            anya_nev=member_data.birth.anya
        ))

    if member_data.baptism:
        db.add(BaptismData(
            member_id=new_id,
            datum=member_data.baptism.datum,
            hely=member_data.baptism.hely,
            vallas=member_data.baptism.vallas,
            keresztelo_szemely=member_data.baptism.keresztelo_szemely,
            keresztapa_nev=member_data.baptism.keresztapa.nev if member_data.baptism.keresztapa else None,
            keresztapa_foglalkozas=member_data.baptism.keresztapa.foglalk if member_data.baptism.keresztapa else None,
            keresztapa_lakhely=member_data.baptism.keresztapa.lakhely if member_data.baptism.keresztapa else None,
            keresztanya_nev=member_data.baptism.keresztanya.nev if member_data.baptism.keresztanya else None,
            keresztanya_foglalkozas=member_data.baptism.keresztanya.foglalk if member_data.baptism.keresztanya else None,
            keresztanya_lakhely=member_data.baptism.keresztanya.lakhely if member_data.baptism.keresztanya else None
        ))

    if member_data.death:
        db.add(DeathData(
            member_id=new_id,
            datum=member_data.death.datum,
            hely=member_data.death.hely,
            ok=member_data.death.ok,
            bejelento=member_data.death.bejelento
        ))

    for mar in member_data.marriages:
        spouse_id = clean_id(mar.spouse_id)
        if spouse_id:
            existing_rel = db.query(Relationship).filter(
                Relationship.type == "spouse",
                ((Relationship.from_id == new_id) & (Relationship.to_id == spouse_id)) |
                ((Relationship.from_id == spouse_id) & (Relationship.to_id == new_id))
            ).first()
            
            if not existing_rel:
                db.add(Relationship(
                    type="spouse",
                    from_id=new_id,
                    to_id=spouse_id
                ))

        db.add(MarriageData(
            member_id=new_id,
            hazastars_nev=mar.hazastars,
            hely=mar.hely,
            ido=mar.datum,
            tanu1_nev=mar.tanu1.nev if mar.tanu1 else None,
            tanu1_foglalkozas=mar.tanu1.foglalk if mar.tanu1 else None,
            tanu1_lakhely=mar.tanu1.lakhely if mar.tanu1 else None,
            tanu2_nev=mar.tanu2.nev if mar.tanu2 else None,
            tanu2_foglalkozas=mar.tanu2.foglalk if mar.tanu2 else None,
            tanu2_lakhely=mar.tanu2.lakhely if mar.tanu2 else None
        ))

    for src in member_data.sources:
        db.add(Source(
            member_id=new_id,
            label=src.label,
            url=src.url
        ))
    
    db.commit()
    return get_member_details_func(new_id, db)

# Védve: Csak ADMIN szerkeszthet
@router.put('/api/member/{member_id}/update')
def update_member(member_id: int, data: MemberUpdateSchema, db: Session = Depends(get_db), current_user: AppUser = Depends(auth.get_current_admin_user)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.last_name = data.last_name
    member.first_name = data.first_name
    member.foglalkozas_tortenet = data.foglalkozas
    member.lakhely_tortenet = data.lakhely
    member.komment = data.komment

    if data.sort_order is not None:
        if str(data.sort_order).strip() == "":
            member.sort_order = None
        else:
            try:
                member.sort_order = int(data.sort_order)
            except ValueError:
                pass 

    birth_record = db.query(BirthData).filter(BirthData.member_id == member_id).first()
    if data.birth:
        if not birth_record:
            birth_record = BirthData(member_id=member_id)
            db.add(birth_record)
        birth_record.datum = data.birth.datum
        birth_record.hely = data.birth.hely

    baptism_record = db.query(BaptismData).filter(BaptismData.member_id == member_id).first()
    if data.baptism:
        if not baptism_record:
            baptism_record = BaptismData(member_id=member_id)
            db.add(baptism_record)
        
        baptism_record.datum = data.baptism.datum
        baptism_record.hely = data.baptism.hely
        baptism_record.vallas=data.baptism.vallas
        baptism_record.keresztelo_szemely=data.baptism.keresztelo_szemely
        
        if data.baptism.keresztapa:
            baptism_record.keresztapa_nev = data.baptism.keresztapa.nev
            baptism_record.keresztapa_lakhely = data.baptism.keresztapa.lakhely
            baptism_record.keresztapa_foglalkozas = data.baptism.keresztapa.foglalk
            
        if data.baptism.keresztanya:
            baptism_record.keresztanya_nev = data.baptism.keresztanya.nev
            baptism_record.keresztanya_lakhely = data.baptism.keresztanya.lakhely
            baptism_record.keresztanya_foglalkozas = data.baptism.keresztanya.foglalk

    death_record = db.query(DeathData).filter(DeathData.member_id == member_id).first()
    if data.death:
        has_death_data = any([data.death.datum, data.death.hely, data.death.ok, data.death.bejelento])
        
        if has_death_data:
            if not death_record:
                death_record = DeathData(member_id=member_id)
                db.add(death_record)
            death_record.datum = data.death.datum
            death_record.hely = data.death.hely
            death_record.ok = data.death.ok
            death_record.bejelento = data.death.bejelento
        elif death_record and not has_death_data:
            pass 

    def clean_id(val):
        if val == "" or val is None: return None
        return int(val)

    father_id = clean_id(data.father_id)
    mother_id = clean_id(data.mother_id)

    # Szinkronizáljuk a kiválasztott szülők nevét a BirthData táblába
    if not birth_record and (father_id or mother_id):
        birth_record = BirthData(member_id=member_id)
        db.add(birth_record)

    if birth_record:
        if father_id:
            father = db.query(Member).filter(Member.id == father_id).first()
            birth_record.apa_nev = f"{father.last_name} {father.first_name}" if father else None
        elif data.father_id == "":
            birth_record.apa_nev = None

        if mother_id:
            mother = db.query(Member).filter(Member.id == mother_id).first()
            birth_record.anya_nev = f"{mother.last_name} {mother.first_name}" if mother else None
        elif data.mother_id == "":
            birth_record.anya_nev = None

    rel = db.query(Relationship).filter(
        Relationship.to_id == member_id,
        Relationship.type == "parent"
    ).first()

    active_parent_id = None
    if father_id:
        active_parent_id=father_id
    elif father_id is None and mother_id:
        active_parent_id=mother_id

    if rel:
        rel.parent1_id = father_id
        rel.parent2_id = mother_id
        if active_parent_id:
            rel.from_id = active_parent_id
    elif father_id or mother_id:
        new_rel = Relationship(
            type="parent",
            from_id = active_parent_id,           
            to_id=member_id,
            parent1_id=father_id,
            parent2_id=mother_id
        )
        db.add(new_rel)

    db.query(MarriageData).filter(MarriageData.member_id == member_id).delete()
    
    for mar in data.marriages:
        if mar.hazastars or mar.datum or mar.hely or mar.spouse_id:
            current_spouse_name = mar.hazastars 
            
            if mar.spouse_id and str(mar.spouse_id) != "":
                sp_id = int(mar.spouse_id)
                
                spouse_member = db.query(Member).filter(Member.id == sp_id).first()
                if spouse_member:
                    current_spouse_name = f"{spouse_member.last_name} {spouse_member.first_name}"

                existing_rel = db.query(Relationship).filter(
                    Relationship.type == "spouse",
                    ((Relationship.from_id == member_id) & (Relationship.to_id == sp_id)) |
                    ((Relationship.from_id == sp_id) & (Relationship.to_id == member_id))
                ).first()

                if not existing_rel:
                    new_sp_rel = Relationship(
                        type="spouse",
                        from_id=member_id,
                        to_id=sp_id
                    )
                    db.add(new_sp_rel)
            
            new_mar = MarriageData(
                member_id=member_id,
                hazastars_nev=current_spouse_name,
                ido=mar.datum,
                hely=mar.hely,
                tanu1_nev=mar.tanu1.nev if mar.tanu1 else None,
                tanu1_lakhely=mar.tanu1.lakhely if mar.tanu1 else None,
                tanu1_foglalkozas=mar.tanu1.foglalk if mar.tanu1 else None,
                tanu2_nev=mar.tanu2.nev if mar.tanu2 else None,
                tanu2_lakhely=mar.tanu2.lakhely if mar.tanu2 else None,
                tanu2_foglalkozas=mar.tanu2.foglalk if mar.tanu2 else None,
            )
            db.add(new_mar)

    db.query(Source).filter(Source.member_id == member_id).delete()
    
    for src in data.sources:
        if src.label or src.url:
            new_src = Source(
                member_id=member_id,
                label=src.label,
                url=src.url
            )
            db.add(new_src)

    db.commit()
    return {"message": "Sikeres frissítés"}


def get_member_details_func(member_id: int, db: Session):
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    birth = db.query(BirthData).filter(BirthData.member_id == member_id).first()
    baptism = db.query(BaptismData).filter(BaptismData.member_id == member_id).first()
    death = db.query(DeathData).filter(DeathData.member_id == member_id).first()
    marriages = db.query(MarriageData).filter(MarriageData.member_id == member_id).all()
    sources = db.query(Source).filter(Source.member_id == member_id).all()

    def has_val(obj, fields):
        if not obj: return False
        return any(getattr(obj, f) is not None for f in fields)

    res = {
        "id": m.id,
        "last_name": m.last_name,
        "first_name": m.first_name,
        "gender": m.gender,
        "komment": m.komment,
        "lakhely": m.lakhely_tortenet,
        "foglalkozas": m.foglalkozas_tortenet,
        "sort_order": m.sort_order,
        "birth": None,
        "baptism": None,
        "death": None,
        "marriages": [],
        "sources": [{"label": s.label, "url": s.url} for s in sources]
    }

    if has_val(birth, ['datum', 'hely']):
        res["birth"] = {
            "datum": birth.datum, 
            "hely": birth.hely, 
            "apa": birth.apa_nev, 
            "anya": birth.anya_nev
        }

    if has_val(baptism, ['datum', 'hely']):
        res["baptism"] = {
            "datum": baptism.datum, 
            "hely": baptism.hely,
            "vallas": baptism.vallas,
            "keresztelo_szemely": baptism.keresztelo_szemely,
            "keresztapa": {"nev": baptism.keresztapa_nev, "foglalk": baptism.keresztapa_foglalkozas, "lakhely": baptism.keresztapa_lakhely} if baptism.keresztapa_nev else None,
            "keresztanya": {"nev": baptism.keresztanya_nev, "foglalk": baptism.keresztanya_foglalkozas, "lakhely": baptism.keresztanya_lakhely} if baptism.keresztanya_nev else None
        }

    if has_val(death, ['datum', 'hely', 'ok', 'bejelento']):
        res["death"] = {
            "datum": death.datum, 
            "hely": death.hely, 
            "ok": death.ok, 
            "bejelento": death.bejelento
        }

    for mar in marriages:
        res["marriages"].append({
            "hazastars": mar.hazastars_nev, 
            "hely": mar.hely, 
            "datum": mar.ido,
            "tanu1": {"nev": mar.tanu1_nev, "foglalk": mar.tanu1_foglalkozas, "lakhely": mar.tanu1_lakhely} if mar.tanu1_nev else None,
            "tanu2": {"nev": mar.tanu2_nev, "foglalk": mar.tanu2_foglalkozas, "lakhely": mar.tanu2_lakhely} if mar.tanu2_nev else None
        })

    return res

# Védve: Bármilyen bejelentkezett felhasználó olvashatja
@router.get('/api/member/{member_id}', response_model=MemberDetailResponse)
def get_member_details(member_id: int, db: Session = Depends(get_db), current_user: AppUser = Depends(auth.get_current_user)):
    return get_member_details_func(member_id, db)


# Védve: Bármilyen bejelentkezett felhasználó olvashatja
@router.get('/api/members/search-list', response_model=List[MemberSearchSchema])
def get_search_list(db: Session = Depends(get_db), current_user: AppUser = Depends(auth.get_current_admin_user)):
    members = db.query(Member).all()
    
    result = []
    for m in members:
        birth = db.query(BirthData).filter(BirthData.member_id == m.id).first()
        
        year = None
        if birth and birth.datum:
            year = birth.datum[:4] if len(birth.datum) >= 4 else birth.datum

        result.append({
            "id": m.id,
            "full_name": f"{m.last_name} {m.first_name}",
            "birth_year": year,
            "gender": m.gender
        })
    
    return result

@router.get("/health")
def health_check():
    return {"status": "awake"}