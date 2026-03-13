"""
Mock Twilio Server for testing NOC escalation flow.

This server replicates Twilio's Call API behavior for local development
and testing without making real phone calls.
"""
import re
import uuid
import asyncio
import logging
import urllib.parse
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request, Form, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Twilio Mock Server")

FALLBACK_CALLBACK_URL = "http://api:8000/api/v1/twilio/callback"
FALLBACK_STATUS_URL = "http://api:8000/api/v1/twilio/status"


def generate_call_sid() -> str:
    """Generate a realistic Twilio Call SID starting with 'CA'."""
    return f"CA{uuid.uuid4().hex[:32]}"


def extract_action_url(twiml: Optional[str]) -> Optional[str]:
    """Extract action URL from TwiML using regex. Handles URL-encoded TwiML."""
    if not twiml:
        logger.warning("No TwiML provided, will use fallback URL")
        return None
    
    # Try to find action in the TwiML
    match = re.search(r'action="([^"]+)"', twiml)
    if match:
        url = urllib.parse.unquote(match.group(1))
        logger.info(f"Extracted action URL from TwiML: {url}")
        return url
    
    logger.error(f"Failed to extract action URL from TwiML: {twiml[:200]}")
    return None


def create_twilio_call_response(
    call_sid: str,
    account_sid: str,
    to_number: str,
    from_number: str,
    status: str = "queued",
    uri: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a realistic Twilio Call response object with correct key names."""
    now = datetime.now(timezone.utc)
    if uri is None:
        uri = f"/2010-04-01/Accounts/{account_sid}/Calls/{call_sid}.json"

    return {
        "sid": call_sid,  # Use 'sid' not 'call_sid'
        "account_sid": account_sid,
        "api_version": "2010-04-01",
        "byoc": None,
        "call_token": None,
        "caller_name": None,
        "date_created": now.isoformat(),
        "date_updated": now.isoformat(),
        "direction": "outbound-api",
        "duration": None,
        "end_time": None,
        "forwarded_from": None,
        "from": from_number,  # Use 'from' not 'from_'
        "group_sid": None,
        "status": status,
        "subresource_uris": {
            "notifications": f"/2010-04-01/Accounts/{account_sid}/Calls/{call_sid}/Notifications.json",
            "recordings": f"/2010-04-01/Accounts/{account_sid}/Calls/{call_sid}/Recordings.json",
        },
        "to": to_number,
        "uri": uri,
        "price": None,
        "price_unit": "USD",
        "phone_number_sid": None,
    }


async def send_webhook(url: str, data: Dict[str, Any], timeout: float = 5.0) -> bool:
    """Send a webhook POST request as form data. Returns True if successful."""
    if not url:
        logger.warning("No URL provided for webhook, skipping")
        return False
    
    # Replace localhost/127.0.0.1 with 'api' for Docker networking
    url = url.replace("localhost", "api").replace("127.0.0.1", "api")
    
    try:
        logger.info(f"Sending webhook to: {url} with data: {data}")
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url, 
                data=data,  # Use 'data' for form-encoded, NOT 'json'
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            logger.info(f"Webhook response status: {response.status_code}, body: {response.text[:200]}")
            return True
    except httpx.ConnectError as e:
        logger.error(f"Connection failed to {url}: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send webhook to {url}: {e}")
        return False


async def scenario_1_happy_path(
    call_sid: str,
    action_url: Optional[str],
    background_tasks: BackgroundTasks,
):
    """Scenario 1 - Happy Path: Wait 2 seconds, then send Digits='1' webhook."""
    logger.info(f"Setting up Scenario 1 for call {call_sid}")
    
    async def task():
        logger.info(f"Scenario 1: Waiting 2 seconds before sending webhook for call {call_sid}")
        await asyncio.sleep(2)
        if action_url:
            logger.info(f"Scenario 1: Sending Digits='1' webhook for call {call_sid} to {action_url}")
            await send_webhook(
                action_url,
                {"CallSid": call_sid, "Digits": "1"},
            )
        else:
            logger.warning(f"Scenario 1: No action_url, skipping webhook for call {call_sid}")
    background_tasks.add_task(task)


async def scenario_2_no_answer(
    call_sid: str,
    status_callback: Optional[str],
    background_tasks: BackgroundTasks,
):
    """Scenario 2 - No Answer: Return 201, do nothing (simulates timeout/retry)."""
    logger.info(f"Setting up Scenario 2 for call {call_sid} - will do nothing (timeout simulation)")
    # Do nothing - simulates a timeout so Celery worker will retry
    pass


async def scenario_3_wrong_input(
    call_sid: str,
    action_url: Optional[str],
    background_tasks: BackgroundTasks,
):
    """Scenario 3 - Wrong Input: Wait 2 seconds, send Digits='5' webhook."""
    logger.info(f"Setting up Scenario 3 for call {call_sid}")
    
    async def task():
        logger.info(f"Scenario 3: Waiting 2 seconds before sending webhook for call {call_sid}")
        await asyncio.sleep(2)
        if action_url:
            logger.info(f"Scenario 3: Sending Digits='5' webhook for call {call_sid} to {action_url}")
            await send_webhook(
                action_url,
                {"CallSid": call_sid, "Digits": "5"},
            )
    background_tasks.add_task(task)


async def scenario_4_call_failed(call_sid: str):
    """Scenario 4 - Call Failed: Raise HTTPException to return 400."""
    logger.warning(f"Scenario 4: Call {call_sid} failed")
    raise HTTPException(status_code=400, detail="Call failed")


async def scenario_5_busy_line(
    call_sid: str,
    status_callback: Optional[str],
    background_tasks: BackgroundTasks,
):
    """Scenario 5 - Busy Line: Return 201, wait 1 second, send busy status."""
    logger.info(f"Setting up Scenario 5 for call {call_sid}")
    
    async def task():
        logger.info(f"Scenario 5: Waiting 1 second before sending status callback for call {call_sid}")
        await asyncio.sleep(1)
        if status_callback:
            logger.info(f"Scenario 5: Sending CallStatus='busy' for call {call_sid} to {status_callback}")
            await send_webhook(
                status_callback,
                {"CallSid": call_sid, "CallStatus": "busy"},
            )
    background_tasks.add_task(task)


async def scenario_6_voicemail(
    call_sid: str,
    status_callback: Optional[str],
    action_url: Optional[str],
    background_tasks: BackgroundTasks,
):
    """Scenario 6 - Voicemail/No Digits: Return 201, wait 5 seconds, send completed status (no digits)."""
    logger.info(f"Setting up Scenario 6 for call {call_sid}")
    
    async def task():
        logger.info(f"Scenario 6: Waiting 5 seconds before sending status callback for call {call_sid}")
        await asyncio.sleep(5)
        if status_callback:
            logger.info(f"Scenario 6: Sending CallStatus='completed' for call {call_sid} to {status_callback}")
            await send_webhook(
                status_callback,
                {"CallSid": call_sid, "CallStatus": "completed"},
            )
    background_tasks.add_task(task)


async def scenario_7_race_condition(
    call_sid: str,
    action_url: Optional[str],
    background_tasks: BackgroundTasks,
):
    """Scenario 7 - Race Condition/Late Ack: Return 201, wait 65 seconds (longer than retry delay)."""
    logger.info(f"Setting up Scenario 7 for call {call_sid} - will send late ack after 65 seconds")
    
    async def task():
        logger.info(f"Scenario 7: Waiting 65 seconds before sending webhook for call {call_sid}")
        await asyncio.sleep(65)
        if action_url:
            logger.info(f"Scenario 7: Sending Digits='1' (late ack) for call {call_sid} to {action_url}")
            await send_webhook(
                action_url,
                {"CallSid": call_sid, "Digits": "1"},
            )
    background_tasks.add_task(task)


async def scenario_8_network_timeout(
    call_sid: str,
    action_url: Optional[str],
    background_tasks: BackgroundTasks,
):
    """Scenario 8 - Network Timeout: Try to send to invalid port (connection refused)."""
    logger.info(f"Setting up Scenario 8 for call {call_sid}")
    
    async def task():
        # Wait a bit before attempting the failed webhook
        await asyncio.sleep(1)
        # Attempt to send to an invalid endpoint to simulate network failure
        invalid_url = "http://api:9999/webhook"
        logger.info(f"Scenario 8: Attempting to send webhook to invalid URL: {invalid_url}")
        await send_webhook(invalid_url, {"CallSid": call_sid, "Digits": "1"}, timeout=2.0)
    background_tasks.add_task(task)


@app.post("/2010-04-01/Accounts/{AccountSid}/Calls.json")
async def create_call(
    AccountSid: str,
    background_tasks: BackgroundTasks,
    To: str = Form(...),
    From: str = Form(...),
    Twiml: Optional[str] = Form(None),
    StatusCallback: Optional[str] = Form(None),
    # TwiML attributes (all optional)
    Method: Optional[str] = Form(None),
    StatusCallbackEvent: Optional[str] = Form(None),
    Timeout: Optional[int] = Form(None),
    Record: Optional[bool] = Form(None),
    RecordingTrack: Optional[str] = Form(None),
    SendDigits: Optional[str] = Form(None),
    IfMachine: Optional[str] = Form(None),
    MachineDetection: Optional[str] = Form(None),
    MachineDetectionTimeout: Optional[int] = Form(None),
    CallerId: Optional[str] = Form(None),
    FallbackUrl: Optional[str] = Form(None),
    FallbackMethod: Optional[str] = Form(None),
    MachineDetectionSpeechThreshold: Optional[int] = Form(None),
    MachineDetectionSpeechEndThreshold: Optional[int] = Form(None),
    MachineDetectionSilenceTimeout: Optional[int] = Form(None),
    AsyncAmd: Optional[str] = Form(None),
    AsyncAmdStatusCallback: Optional[str] = Form(None),
    AsyncAmdStatusCallbackMethod: Optional[str] = Form(None),
    Byoc: Optional[str] = Form(None),
    CallReason: Optional[str] = Form(None),
    TimeLimit: Optional[int] = Form(None),
    Transcribe: Optional[bool] = Form(None),
    TranscriptionConfiguration: Optional[str] = Form(None),
    ClientNotificationUrl: Optional[str] = Form(None),
):
    """
    Create a Twilio Call.
    
    This endpoint mimics the real Twilio Calls API.
    """
    logger.info(f"Received call creation request: To={To}, From={From}, AccountSid={AccountSid}")
    
    call_sid = generate_call_sid()
    logger.info(f"Generated call SID: {call_sid}")
    
    # Determine status callback URL (use form data or fallback)
    status_callback = StatusCallback or FALLBACK_STATUS_URL
    logger.info(f"Using status callback URL: {status_callback}")
    
    # Extract action URL from TwiML
    action_url = extract_action_url(Twiml)
    if not action_url:
        action_url = FALLBACK_CALLBACK_URL
        logger.warning(f"Using fallback callback URL: {action_url}")
    
    logger.info(f"Using action URL: {action_url}")
    
    # Determine scenario based on 'To' number
    to_number = To.strip()
    logger.info(f"Routing scenario for phone number: {to_number}")
    
    # Scenario routing
    if to_number == "+11111111111" or to_number == "+1111111111":
        # Scenario 1: Happy Path
        await scenario_1_happy_path(call_sid, action_url, background_tasks)
        
    elif to_number == "+22222222222":
        # Scenario 2: No Answer
        await scenario_2_no_answer(call_sid, status_callback, background_tasks)
        
    elif to_number == "+33333333333":
        # Scenario 3: Wrong Input
        await scenario_3_wrong_input(call_sid, action_url, background_tasks)
        
    elif to_number == "+44444444444":
        # Scenario 4: Call Failed
        await scenario_4_call_failed(call_sid)
        return  # Won't reach here, but for type safety
        
    elif to_number == "+55555555555":
        # Scenario 5: Busy Line
        await scenario_5_busy_line(call_sid, status_callback, background_tasks)
        
    elif to_number == "+66666666666":
        # Scenario 6: Voicemail/No Digits
        await scenario_6_voicemail(call_sid, status_callback, action_url, background_tasks)
        
    elif to_number == "+77777777777":
        # Scenario 7: Race Condition/Late Ack
        await scenario_7_race_condition(call_sid, action_url, background_tasks)
        
    elif to_number == "+88888888888":
        # Scenario 8: Network Timeout
        await scenario_8_network_timeout(call_sid, action_url, background_tasks)
        
    else:
        # Default: Treat as happy path
        logger.info(f"Unknown phone number {to_number}, defaulting to happy path")
        await scenario_1_happy_path(call_sid, action_url, background_tasks)
    
    # Return the Twilio Call response
    response_data = create_twilio_call_response(
        call_sid=call_sid,
        account_sid=AccountSid,
        to_number=to_number,
        from_number=From,
        status="queued",
    )
    
    logger.info(f"Returning response for call {call_sid}: {response_data.get('sid')}")
    return JSONResponse(content=response_data, status_code=201)


@app.get("/2010-04-01/Accounts/{AccountSid}/Calls/{CallSid}.json")
async def get_call(AccountSid: str, CallSid: str):
    """Get a Call by SID (mock implementation)."""
    response_data = create_twilio_call_response(
        call_sid=CallSid,
        account_sid=AccountSid,
        to_number="+1234567890",
        from_number="+0987654321",
        status="completed",
    )
    return response_data


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "twilio-mock"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
