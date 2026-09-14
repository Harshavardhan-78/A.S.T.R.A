from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.access_passes import router as access_passes_router
from app.api.chatbot import router as chatbot_router
from app.api.damage import router as damage_router
from app.api.digital_twin import router as digital_twin_router
from app.api.disputes import router as disputes_router
from app.api.lpr import router as lpr_router
from app.api.media import router as media_router
from app.api.notifications import router as notifications_router
from app.api.ocr import router as ocr_router
from app.api.parking import router as parking_router
from app.api.residents import router as residents_router
from app.api.security import router as security_router
from app.api.anomalies import router as anomalies_router
from app.api.vehicles import router as vehicles_router
from app.api.visitors import router as visitors_router
from app.api.websockets import router as websockets_router


app = FastAPI(
    title="A.S.T.R.A",
    description="AI-Powered Secure Transport Recognition & Access System",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — must be added BEFORE routers so preflight OPTIONS requests are handled
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(residents_router)
app.include_router(vehicles_router)
app.include_router(visitors_router)
app.include_router(access_passes_router)
app.include_router(security_router)
app.include_router(parking_router)
app.include_router(digital_twin_router)
app.include_router(websockets_router)
app.include_router(ocr_router)
app.include_router(lpr_router)
app.include_router(damage_router)
app.include_router(anomalies_router)
app.include_router(disputes_router)
app.include_router(media_router)
app.include_router(notifications_router)
app.include_router(chatbot_router)
app.include_router(analytics_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {"message": "Welcome to A.S.T.R.A"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "application": "A.S.T.R.A"}