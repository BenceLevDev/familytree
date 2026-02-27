@echo off
echo Csaladfa App inditasa...

:: 1. Backend ablak nyitása (belép a backend mappába, AKTIVÁLJA a venv-et, és indítja a pythont)
:: Ha a virtuális környezeted neve nem 'venv', hanem pl. '.venv', akkor írd át azt a részt!
start "Backend Server" cmd /k "cd backend && call venv\Scripts\activate && uvicorn app:app --reload"

:: 2. Frontend ablak nyitása (belép a frontend mappába és indítja az npm-et)
start "Frontend Client" cmd /k "cd frontend && npm run dev"

echo Mindket szerver elindult kulon ablakban!