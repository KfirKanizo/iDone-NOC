import logging
from typing import Optional
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather

from app.config import settings

logger = logging.getLogger(__name__)

LANGUAGE_STRINGS = {
    "en-US": {
        "prefix": "New Incident alert from iDone NOC system.",
        "suffix": "Please press 1 to acknowledge this alert.",
        "no_response": "We did not receive a response. Goodbye.",
    },
    "he-IL": {
        "prefix": "התראת נוק חדשה ממערכת הנוק של iDone.",
        "suffix": "אנא הקש 1 לאישור קבלת ההתראה.",
        "no_response": "לא קיבלנו מענה. להתראות.",
    },
}


class TwilioService:
    def __init__(self):
        self.client = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            self.client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN,
            )
            if settings.TWILIO_MOCK_URL:
                self.client.api.base_url = settings.TWILIO_MOCK_URL
            self.from_number = settings.TWILIO_PHONE_NUMBER
            self.base_url = settings.BASE_URL

    def initiate_escalation_call(
        self,
        to_number: str,
        text_to_say: str,
        incident_id: str,
        language: str = "en-US",
    ) -> Optional[str]:
        if not self.client:
            logger.warning("Twilio not configured, skipping call")
            return None

        strings = LANGUAGE_STRINGS.get(language, LANGUAGE_STRINGS["en-US"])
        full_message = f"{strings['prefix']} {text_to_say} {strings['suffix']}"

        callback_url = f"{self.base_url}/api/v1/twilio/callback?incident_id={incident_id}"

        response = VoiceResponse()
        gather = Gather(
            num_digits=1,
            action=callback_url,
            method="POST",
            timeout=15,
        )
        gather.say(full_message, language=language)
        response.append(gather)
        response.say(strings["no_response"], language=language)

        try:
            call = self.client.calls.create(
                to=to_number,
                from_=self.from_number,
                twiml=str(response),
                status_callback=f"{self.base_url}/api/v1/twilio/status?incident_id={incident_id}",
                status_callback_event=["initiated", "ringing", "answered", "completed"],
            )
            logger.info(f"Call initiated to {to_number}, SID: {call.sid}")
            return call.sid
        except Exception as e:
            logger.error(f"Failed to initiate call to {to_number}: {e}")
            return None


twilio_service = TwilioService()


def initiate_escalation_call(
    to_number: str,
    text_to_say: str,
    incident_id: str,
    language: str = "en-US",
) -> Optional[str]:
    return twilio_service.initiate_escalation_call(to_number, text_to_say, incident_id, language)
