from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.cases import router as cases_router
from routers.evaluation import router as evaluation_router

app = FastAPI(
    title="Ateneo API - Evaluación del Razonamiento Clínico mediante RAG",
    description="Sistema RAG para evaluación formativa de razonamiento clínico basado en GPCs del MSP Ecuador.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router)
app.include_router(evaluation_router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "project": "Ateneo", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
