from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import incidents, twilio, analytics
from app.api.v1.admin import auth, clients, contacts, policies, incidents as admin_incidents
from app.config import settings

app = FastAPI(
    title="NOC Platform API",
    description="Network Operations Center - Incident Management API",
    version="1.0.0",
    docs_url="/api/docs" if settings.BASE_URL else "/docs",
    openapi_url="/api/openapi.json" if settings.BASE_URL else "/openapi.json",
    redoc_url="/api/redoc" if settings.BASE_URL else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents.router, prefix="/api/v1")
app.include_router(twilio.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1/admin")
app.include_router(clients.router, prefix="/api/v1/admin")
app.include_router(contacts.router, prefix="/api/v1/admin")
app.include_router(policies.router, prefix="/api/v1/admin")
app.include_router(admin_incidents.router, prefix="/api/v1/admin")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/")
def root():
    docs_url = "/api/docs" if settings.BASE_URL else "/docs"
    return {
        "message": "NOC Platform API",
        "docs": docs_url,
        "version": "1.0.0",
    }
