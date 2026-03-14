"""
Integration tests for Incidents API.

Tests the full incident lifecycle: creation via inbound endpoint
and acknowledgment via Twilio callback.
"""
import uuid
from unittest.mock import patch
from fastapi import status

from app.models import Client, Contact, EscalationPolicy, Incident, IncidentStatus, IncidentLog, ActionType


def test_happy_path_incident_flow(client, db_session):
    """
    Test the complete incident flow:
    1. Create a Client, Contact, and EscalationPolicy
    2. Create an incident via POST /api/v1/incidents/inbound
    3. Verify incident is created with OPEN status
    4. Simulate Twilio callback with Digits=1 (acknowledge)
    5. Verify incident status changed to ACKNOWLEDGED
    """
    # Arrange: Create test data
    
    # Create a client with API key
    client_obj = Client(
        id=uuid.uuid4(),
        company_name="Test Corp",
        api_key_hash="dummy_hash_for_testing_12345678901234567890",
        is_active=True,
    )
    api_key = "test_api_key_12345678901234567890123456"
    client_obj.set_api_key(api_key)
    db_session.add(client_obj)
    
    # Create a contact with phone number for Scenario 1 (happy path)
    contact_obj = Contact(
        id=uuid.uuid4(),
        client_id=client_obj.id,
        full_name="Test Contact",
        email="test@example.com",
        phone_number="+11111111111",
        is_active=True,
    )
    db_session.add(contact_obj)
    
    # Create an escalation policy linked to the contact at Level 0
    policy_obj = EscalationPolicy(
        id=uuid.uuid4(),
        client_id=client_obj.id,
        name="Test Policy",
        max_retries_per_level=3,
        retry_delay_seconds=60,
        tts_message_template="Alert: {incident_details}. Press 1 to take ownership.",
        level_0_contact_id=contact_obj.id,
        level_1_contact_id=None,
        level_2_contact_id=None,
        level_3_contact_id=None,
        level_4_contact_id=None,
        level_5_contact_id=None,
        is_active=True,
    )
    db_session.add(policy_obj)
    
    db_session.commit()
    
    # Verify initial state
    assert db_session.query(Client).count() == 1
    assert db_session.query(Contact).count() == 1
    assert db_session.query(EscalationPolicy).count() == 1
    
    # Act 1: Create incident via inbound endpoint
    # Mock the Celery task to prevent actual execution
    with patch('app.api.v1.incidents.process_escalation_step.delay') as mock_task:
        response = client.post(
            "/api/v1/incidents/inbound",
            headers={"X-API-Key": api_key},
            json={"details": "Test incident for happy path"}
        )
    
    # Assert 1: Incident created successfully
    assert response.status_code == status.HTTP_200_OK, f"Expected 200, got {response.status_code}: {response.text}"
    response_data = response.json()
    assert response_data["status"] == "accepted"
    assert "incident_id" in response_data
    
    # Verify incident in database
    incidents = db_session.query(Incident).all()
    assert len(incidents) == 1
    
    incident = incidents[0]
    assert incident.status == IncidentStatus.OPEN
    assert incident.client_id == client_obj.id
    assert incident.policy_id == policy_obj.id
    assert incident.current_escalation_level == 0
    
    # Verify log entry was created
    logs = db_session.query(IncidentLog).filter(
        IncidentLog.incident_id == incident.id,
        IncidentLog.action_type == ActionType.INGESTED
    ).all()
    assert len(logs) == 1
    
    # Act 2: Simulate Twilio callback with Digits=1 (acknowledgment)
    response = client.post(
        f"/api/v1/twilio/callback?incident_id={incident.id}",
        data={"CallSid": "CA1234567890", "Digits": "1"}
    )
    
    # Assert 2: Callback processed successfully
    assert response.status_code == status.HTTP_200_OK, f"Expected 200, got {response.status_code}: {response.text}"
    
    # Refresh from database to get updated state
    db_session.refresh(incident)
    
    # Verify incident was acknowledged
    assert incident.status == IncidentStatus.ACKNOWLEDGED, f"Expected ACKNOWLEDGED, got {incident.status}"
    
    # Verify acknowledgment log entry was created
    ack_logs = db_session.query(IncidentLog).filter(
        IncidentLog.incident_id == incident.id,
        IncidentLog.action_type == ActionType.ACKNOWLEDGED
    ).all()
    assert len(ack_logs) == 1
    assert ack_logs[0].details["digits_pressed"] == "1"
    assert ack_logs[0].details["call_sid"] == "CA1234567890"
