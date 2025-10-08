"""
Background task scheduler for document notifications.
This module provides automatic scheduling of document notification emails.
"""

import threading
import time
import logging
from datetime import datetime, time as dt_time
from django.core.management import call_command
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('docunotification.email')


class DocumentNotificationScheduler:
    """
    Background scheduler for document notifications.
    Runs the notification command daily at a specified time.
    """
    
    def __init__(self, run_time_hour=8, run_time_minute=0):
        """
        Initialize the scheduler.
        
        Args:
            run_time_hour (int): Hour to run notifications (24-hour format, default: 8 AM)
            run_time_minute (int): Minute to run notifications (default: 0)
        """
        self.run_time = dt_time(run_time_hour, run_time_minute)
        self.running = False
        self.thread = None
        self._stop_event = threading.Event()
    
    def start(self):
        """Start the background scheduler."""
        if self.running:
            logger.warning("Scheduler is already running")
            return
        
        self.running = True
        self._stop_event.clear()
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        logger.info(f"Document notification scheduler started - will run daily at {self.run_time}")
    
    def stop(self):
        """Stop the background scheduler."""
        if not self.running:
            return
        
        self.running = False
        self._stop_event.set()
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Document notification scheduler stopped")
    
    def _run_scheduler(self):
        """Main scheduler loop."""
        logger.info("Starting document notification scheduler loop")
        
        while self.running and not self._stop_event.is_set():
            try:
                current_time = timezone.now().time()
                current_date = timezone.now().date()
                
                # Check if it's time to run
                if self._should_run_now(current_time):
                    logger.info(f"Running scheduled document notifications at {current_time}")
                    self._run_notifications()
                    
                    # Wait until tomorrow to avoid running multiple times
                    self._wait_until_tomorrow()
                else:
                    # Wait 60 seconds before checking again
                    self._stop_event.wait(60)
                    
            except Exception as e:
                logger.error(f"Error in scheduler loop: {str(e)}")
                # Wait 5 minutes before retrying after an error
                self._stop_event.wait(300)
    
    def _should_run_now(self, current_time):
        """
        Check if notifications should run now.
        
        Args:
            current_time: Current time
            
        Returns:
            bool: True if should run now
        """
        # Run if current time is within 1 minute of scheduled time
        scheduled_minutes = self.run_time.hour * 60 + self.run_time.minute
        current_minutes = current_time.hour * 60 + current_time.minute
        
        return abs(current_minutes - scheduled_minutes) <= 1
    
    def _wait_until_tomorrow(self):
        """Wait until tomorrow's scheduled time."""
        now = timezone.now()
        tomorrow = now.replace(hour=self.run_time.hour, minute=self.run_time.minute, 
                              second=0, microsecond=0) + timezone.timedelta(days=1)
        
        wait_seconds = (tomorrow - now).total_seconds()
        logger.info(f"Waiting {wait_seconds/3600:.1f} hours until next scheduled run")
        
        # Break the wait into smaller chunks to allow for stopping
        while wait_seconds > 0 and self.running and not self._stop_event.is_set():
            chunk_wait = min(wait_seconds, 300)  # Wait in 5-minute chunks
            self._stop_event.wait(chunk_wait)
            wait_seconds -= chunk_wait
    
    def _run_notifications(self):
        """Run the document notifications command."""
        try:
            logger.info("Executing document notification command...")
            call_command('send_document_notifications', verbosity=1)
            logger.info("Document notification command completed successfully")
        except Exception as e:
            logger.error(f"Failed to run document notifications: {str(e)}")
    
    def run_now(self):
        """Manually trigger notifications (for testing)."""
        if not self.running:
            logger.warning("Scheduler is not running")
            return
        
        logger.info("Manually triggering document notifications")
        self._run_notifications()


# Global scheduler instance
_scheduler = None


def start_notification_scheduler(run_time_hour=8, run_time_minute=0):
    """
    Start the global document notification scheduler.
    
    Args:
        run_time_hour (int): Hour to run notifications (24-hour format)
        run_time_minute (int): Minute to run notifications
    """
    global _scheduler
    
    if _scheduler and _scheduler.running:
        logger.warning("Notification scheduler is already running")
        return _scheduler
    
    _scheduler = DocumentNotificationScheduler(run_time_hour, run_time_minute)
    _scheduler.start()
    return _scheduler


def stop_notification_scheduler():
    """Stop the global document notification scheduler."""
    global _scheduler
    
    if _scheduler:
        _scheduler.stop()
        _scheduler = None


def get_scheduler():
    """Get the current scheduler instance."""
    return _scheduler


def is_scheduler_running():
    """Check if the scheduler is currently running."""
    return _scheduler and _scheduler.running


def trigger_notifications_now():
    """Manually trigger notifications now (for testing)."""
    if _scheduler:
        _scheduler.run_now()
    else:
        logger.warning("No scheduler instance available. Starting temporary instance...")
        temp_scheduler = DocumentNotificationScheduler()
        temp_scheduler._run_notifications()