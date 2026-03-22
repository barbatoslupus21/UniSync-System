import threading
import logging
from datetime import time as dt_time
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class OvertimeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'overtime'

    def ready(self):
        import sys
        if any(cmd in sys.argv for cmd in ['migrate', 'makemigrations', 'shell', 'collectstatic', 'test']):
            return
        try:
            _start_passcode_scheduler(run_time_hour=7, run_time_minute=0)
            logger.info('Overtime passcode scheduler initialized (runs daily at 07:00).')
        except Exception as e:
            logger.error(f'Failed to start overtime passcode scheduler: {e}')


def _passcode_is_stale(scheduled_hour, scheduled_minute):
    """
    Returns True if the active passcode has not been generated yet for today
    AND the current local time is at or past the scheduled generation time.
    """
    from django.utils import timezone
    from overtime.models import OvertimePasscode

    now = timezone.localtime(timezone.now())
    scheduled_minutes = scheduled_hour * 60 + scheduled_minute
    current_minutes = now.hour * 60 + now.minute

    if current_minutes < scheduled_minutes:
        # Not yet time to generate today's passcode
        return False

    passcode = OvertimePasscode.objects.filter(is_active=True).first()
    if passcode is None:
        return True  # No passcode yet — generate one

    last_updated = timezone.localtime(passcode.updated_at).date()
    return last_updated < now.date()


def _start_passcode_scheduler(run_time_hour=7, run_time_minute=0):
    """Start a background thread that generates a new passcode daily at the given time.
    Also catches up immediately on startup if the passcode is stale.
    """
    from django.utils import timezone
    from django.core.management import call_command

    scheduled_time = dt_time(run_time_hour, run_time_minute)
    stop_event = threading.Event()

    def _scheduler_loop():
        logger.info(f'Passcode scheduler thread started — will run daily at {scheduled_time}.')
        while not stop_event.is_set():
            try:
                now = timezone.localtime(timezone.now())
                current_minutes = now.hour * 60 + now.minute
                scheduled_minutes = scheduled_time.hour * 60 + scheduled_time.minute

                # Generate if it's exactly the scheduled time OR if passcode is stale
                # (server started after 7:00 AM and passcode hasn't been updated today)
                if abs(current_minutes - scheduled_minutes) <= 1 or _passcode_is_stale(run_time_hour, run_time_minute):
                    logger.info('Generating daily overtime passcode…')
                    call_command('generate_passcode', verbosity=0)

                    # Wait until tomorrow's scheduled time before checking again
                    tomorrow = now.replace(
                        hour=scheduled_time.hour,
                        minute=scheduled_time.minute,
                        second=0,
                        microsecond=0,
                    ) + timezone.timedelta(days=1)
                    wait_seconds = (tomorrow - timezone.localtime(timezone.now())).total_seconds()
                    logger.info(f'Next passcode generation in {wait_seconds / 3600:.1f} hours.')
                    _interruptible_wait(stop_event, wait_seconds)
                else:
                    stop_event.wait(60)
            except Exception as exc:
                logger.error(f'Error in passcode scheduler: {exc}')
                stop_event.wait(300)

    thread = threading.Thread(target=_scheduler_loop, daemon=True, name='OvertimePasscodeScheduler')
    thread.start()


def _interruptible_wait(stop_event, total_seconds):
    """Wait for total_seconds but wake up every 5 minutes to allow clean shutdown."""
    while total_seconds > 0 and not stop_event.is_set():
        chunk = min(total_seconds, 300)
        stop_event.wait(chunk)
        total_seconds -= chunk

