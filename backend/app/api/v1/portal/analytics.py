from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Incident, IncidentLog, IncidentStatus, ActionType, User
from app.api.deps import get_current_client_user

router = APIRouter(tags=["portal-analytics"])


class DashboardStatsResponse(BaseModel):
    open_count: int
    acknowledged_count: int
    total_count: int
    time_range: str


class EscalationFunnelItem(BaseModel):
    level: str
    count: int


class IncidentsTrendItem(BaseModel):
    date: str
    count: int


class ChartsDataResponse(BaseModel):
    mtta_seconds: Optional[float]
    escalation_funnel: List[EscalationFunnelItem]
    incidents_trend: List[IncidentsTrendItem]


def get_date_range_filter(time_range: str):
    now = datetime.utcnow()
    if time_range == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif time_range == "last_7_days":
        start_date = now - timedelta(days=7)
    elif time_range == "last_30_days":
        start_date = now - timedelta(days=30)
    else:
        return None
    return Incident.created_at >= start_date


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    time_range: str = Query("last_7_days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client_user),
):
    query = db.query(Incident).filter(Incident.client_id == current_user.client_id)

    date_filter = get_date_range_filter(time_range)
    if date_filter is not None:
        query = query.filter(date_filter)

    total_count = query.count()
    open_count = query.filter(Incident.status == IncidentStatus.OPEN).count()
    acknowledged_count = query.filter(Incident.status == IncidentStatus.ACKNOWLEDGED).count()

    return DashboardStatsResponse(
        open_count=open_count,
        acknowledged_count=acknowledged_count,
        total_count=total_count,
        time_range=time_range,
    )


@router.get("/charts", response_model=ChartsDataResponse)
def get_charts_data(
    time_range: str = Query("last_30_days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client_user),
):
    base_query = db.query(Incident).filter(Incident.client_id == current_user.client_id)

    date_filter = get_date_range_filter(time_range)
    if date_filter is not None:
        base_query = base_query.filter(date_filter)

    mtta_seconds = calculate_mtta(db, base_query)
    escalation_funnel = calculate_escalation_funnel(base_query)
    incidents_trend = calculate_incidents_trend(db, base_query, time_range)

    return ChartsDataResponse(
        mtta_seconds=mtta_seconds,
        escalation_funnel=escalation_funnel,
        incidents_trend=incidents_trend,
    )


def calculate_mtta(db: Session, base_query):
    acknowledged_incidents = base_query.filter(
        Incident.status.in_([IncidentStatus.ACKNOWLEDGED, IncidentStatus.RESOLVED])
    ).all()

    if not acknowledged_incidents:
        return None

    total_seconds = 0
    count = 0

    for incident in acknowledged_incidents:
        first_ack_log = db.query(IncidentLog).filter(
            IncidentLog.incident_id == incident.id,
            IncidentLog.action_type == ActionType.ACKNOWLEDGED
        ).order_by(IncidentLog.created_at.asc()).first()

        if first_ack_log:
            time_diff = (first_ack_log.created_at - incident.created_at).total_seconds()
            total_seconds += time_diff
            count += 1

    if count == 0:
        return None

    return round(total_seconds / count, 2)


def calculate_escalation_funnel(base_query):
    incidents = base_query.all()

    funnel_data = {}
    for level in range(6):
        funnel_data[f"Level {level}"] = 0

    for incident in incidents:
        if incident.status == IncidentStatus.FAILED_ESCALATION:
            funnel_data["Failed"] = funnel_data.get("Failed", 0) + 1
        elif incident.current_escalation_level >= 0:
            key = f"Level {incident.current_escalation_level}"
            funnel_data[key] = funnel_data.get(key, 0) + 1

    return [
        EscalationFunnelItem(level=key, count=value)
        for key, value in funnel_data.items()
        if value > 0
    ]


def calculate_incidents_trend(db: Session, base_query, time_range: str):
    if time_range == "today":
        days = 1
    elif time_range == "last_7_days":
        days = 7
    elif time_range == "last_30_days":
        days = 30
    else:
        days = 365

    trend_data = {}
    now = datetime.utcnow()

    for i in range(days):
        date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        trend_data[date] = 0

    incidents = base_query.all()
    for incident in incidents:
        date = incident.created_at.strftime("%Y-%m-%d")
        if date in trend_data:
            trend_data[date] += 1

    sorted_trend = [
        IncidentsTrendItem(date=date, count=count)
        for date, count in sorted(trend_data.items())
    ]

    return sorted_trend
