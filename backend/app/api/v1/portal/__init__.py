from fastapi import APIRouter

from app.api.v1.portal import incidents, contacts, analytics

router = APIRouter(prefix="/portal", tags=["portal"])

router.include_router(incidents.router)
router.include_router(contacts.router)
router.include_router(analytics.router)
