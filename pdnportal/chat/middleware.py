from django.utils import timezone
from django.db import OperationalError
import logging

logger = logging.getLogger(__name__)

class UserOnlineStatusMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self._last_update = {}  # Cache last update time per user

    def __call__(self, request):
        # Update user online status before processing the request
        if request.user.is_authenticated:
            user_id = request.user.id
            now = timezone.now()
            
            # Only update every 60 seconds to reduce database writes
            last_update = self._last_update.get(user_id)
            if last_update is None or (now - last_update).total_seconds() > 60:
                try:
                    from .models import UserOnlineStatus
                    UserOnlineStatus.objects.update_or_create(
                        user=request.user,
                        defaults={'is_online': True}
                    )
                    self._last_update[user_id] = now
                except OperationalError as e:
                    # Database is locked, skip this update
                    logger.warning(f"Database locked, skipping online status update for user {user_id}: {e}")
                except Exception as e:
                    logger.error(f"Error updating online status for user {user_id}: {e}")

        # Process the request
        response = self.get_response(request)

        return response
