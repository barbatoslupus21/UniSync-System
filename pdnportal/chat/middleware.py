from .models import UserOnlineStatus
import logging
import time
from django.db.utils import OperationalError

logger = logging.getLogger('chat.middleware')


class UserOnlineStatusMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Process the request
        response = self.get_response(request)

        # Update user online status after the response is generated
        if getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False):
            # Try a few times in case of transient DB locks (common with SQLite under concurrency)
            max_attempts = 3
            for attempt in range(1, max_attempts + 1):
                try:
                    UserOnlineStatus.objects.update_or_create(
                        user=request.user,
                        defaults={'is_online': True}
                    )
                    break
                except OperationalError as e:
                    # Log a warning and retry shortly; do not raise so we don't break the request
                    logger.warning(
                        "Transient DB error updating UserOnlineStatus (attempt %d/%d): %s",
                        attempt,
                        max_attempts,
                        str(e)
                    )
                    # Small backoff before retrying
                    time.sleep(0.05)
                except Exception as e:
                    # Unexpected error - log and stop trying
                    logger.exception("Failed to update UserOnlineStatus: %s", str(e))
                    break

        return response
