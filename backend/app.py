import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Behúzzuk az általunk készített routert
from routers import router

app = FastAPI(title="Családfa API")

# CORS beállítás környezeti változókból
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Itt "drótozzuk" rá az összes végpontot az alkalmazásra
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)