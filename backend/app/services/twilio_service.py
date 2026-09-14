import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class TwilioService:
    @staticmethod
    async def send_sms(to_phone: str, message: str) -> dict:
        sid = settings.TWILIO_ACCOUNT_SID
        token = settings.TWILIO_AUTH_TOKEN
        from_phone = settings.TWILIO_PHONE_NUMBER

        # Check if Twilio credentials are provided and valid
        if not sid or not token or not from_phone or sid.startswith("your_") or token.startswith("your_"):
            logger.info("Twilio credentials not configured. SMS notification retained in-app.")
            return {
                "status": "NOT_CONFIGURED",
                "detail": "Twilio not configured. Retaining notification in-app.",
                "sms_id": None,
            }

        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    auth=(sid, token),
                    data={
                        "From": from_phone,
                        "To": to_phone,
                        "Body": message,
                    },
                    timeout=10.0,
                )

                if response.status_code in (200, 201):
                    data = response.json()
                    return {
                        "status": "DELIVERED",
                        "detail": "SMS sent successfully via Twilio",
                        "sms_id": data.get("sid"),
                    }
                else:
                    logger.warning(f"Twilio error {response.status_code}")
                    return {
                        "status": "FAILED",
                        "detail": f"Twilio API returned status {response.status_code}",
                        "sms_id": None,
                    }
        except Exception as exc:
            logger.error("Failed to communicate with Twilio")
            return {
                "status": "FAILED",
                "detail": "Twilio connection error",
                "sms_id": None,
            }
