import json
from database import SessionLocal, engine
from models import Base, Member, Relationship, BirthData, BaptismData, DeathData, MarriageData, Source

def clean_na(val):
    """Segédfüggvény: Ha N/A, üres vagy None, None-t ad vissza"""
    if val is None: return None
    s = str(val).strip()
    return None if s.upper() == "N/A" or s == "" else s

def import_json():
    try:
        with open('familyMembers.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("[-] Hiba: A familyMembers.json nem található!")
        return

    # Flask app context helyett közvetlen Session indítás
    db = SessionLocal()

    try:
        # Adatbázis resetelése (törlés és újra létrehozás)
        # Figyelem: A Base.metadata.drop_all minden táblát töröl, ami a Base-ből örököl!
        print("[*] Adatbázis resetelése...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("[+] Adatbázis táblák létrehozva...")

        for m in data['members']:
            # 1. Alapadatok (ID és név kötelező, többi tisztítva)
            new_member = Member(
                id=m['id'],
                first_name=m.get('first_name', ''),
                last_name=m.get('last_name', ''),
                gender=clean_na(m.get('gender')),
                generation=m.get('generation', 1),
                sort_order=m.get('sort_order', m['id']),
                image_url=clean_na(m.get('image')),
                komment=clean_na(m.get('komment')),
                lakhely_tortenet=clean_na(m.get('lakhely')),
                foglalkozas_tortenet=clean_na(m.get('foglalkozas'))
            )
            db.add(new_member) # db.session.add helyett db.add

            # 2. Születés (Csak ha van dátum vagy hely)
            s_dat = clean_na(m.get('szuletes_datum'))
            s_hely = clean_na(m.get('szuletes_hely'))
            if s_dat or s_hely:
                db.add(BirthData(
                    member_id=m['id'],
                    datum=s_dat,
                    hely=s_hely,
                    apa_nev=clean_na(m.get('apa_nev')),
                    anya_nev=clean_na(m.get('anya_nev'))
                ))

            # 3. Keresztelő
            k_dat = clean_na(m.get('keresztelet_datum'))
            if k_dat:
                db.add(BaptismData(
                    member_id=m['id'],
                    datum=k_dat,
                    hely=clean_na(m.get('keresztelet_hely')),
                    keresztapa_nev=clean_na(m.get('keresztapa')),
                    keresztapa_foglalkozas=clean_na(m.get('keresztapa_foglalkozas')),
                    keresztapa_lakhely=clean_na(m.get('keresztapa_lakhely')),
                    keresztanya_nev=clean_na(m.get('keresztanya')),
                    keresztanya_foglalkozas=clean_na(m.get('keresztanya_foglalkozas')),
                    keresztanya_lakhely=clean_na(m.get('keresztanya_lakhely'))
                ))

            # 4. Halálozás
            h_dat = clean_na(m.get('elhalalozas_datum'))
            if h_dat:
                db.add(DeathData(
                    member_id=m['id'],
                    datum=h_dat,
                    hely=clean_na(m.get('elhalalozas_hely')),
                    ok=clean_na(m.get('halal_ok')),
                    bejelento=clean_na(m.get('halal_bejelento'))
                ))

            # 5. Esküvő
            e_dat = clean_na(m.get('eskuvo_ido'))
            if e_dat:
                db.add(MarriageData(
                    member_id=m['id'],
                    hazastars_nev=clean_na(m.get('hazastars_nev')),
                    hely=clean_na(m.get('eskuvo_hely')),
                    ido=e_dat,
                    tanu1_nev=clean_na(m.get('tanu1_nev')),
                    tanu1_foglalkozas=clean_na(m.get('tanu1_foglalkozas')),
                    tanu1_lakhely=clean_na(m.get('tanu1_lakhely')),
                    tanu2_nev=clean_na(m.get('tanu2_nev')),
                    tanu2_foglalkozas=clean_na(m.get('tanu2_foglalkozas')),
                    tanu2_lakhely=clean_na(m.get('tanu2_lakhely'))
                ))

            # 6. Források
            sources = m.get('forras_url', [])
            if isinstance(sources, list):
                for s in sources:
                    url = clean_na(s.get('url'))
                    if url:
                        db.add(Source(member_id=m['id'], label=s.get('label', 'Forrás'), url=url))

        # 7. Kapcsolatok
        for r in data['relationships']:
            db.add(Relationship(
                type=r['type'],
                from_id=r.get('from'),
                to_id=r.get('to'),
                parent1_id=r.get('parent1id'),
                parent2_id=r.get('parent2id')
            ))

        db.commit()
        print("[!] Minden adat szétválogatva és importálva a family.db-be.")

    except Exception as e:
        print(f"[-] Hiba történt az importálás során: {e}")
        db.rollback() # Hiba esetén visszavonjuk a tranzakciót
    finally:
        db.close() # Mindig lezárjuk a kapcsolatot

if __name__ == '__main__':
    import_json()