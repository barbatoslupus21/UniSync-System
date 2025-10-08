"""
Django management command to manage the document notification scheduler.
"""

from django.core.management.base import BaseCommand
from docunotification.scheduler import (
    start_notification_scheduler, 
    stop_notification_scheduler, 
    get_scheduler,
    is_scheduler_running,
    trigger_notifications_now
)


class Command(BaseCommand):
    help = 'Manage the document notification scheduler'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['start', 'stop', 'status', 'trigger'],
            help='Action to perform on the scheduler'
        )
        parser.add_argument(
            '--hour',
            type=int,
            default=8,
            help='Hour to run notifications (24-hour format, default: 8)'
        )
        parser.add_argument(
            '--minute',
            type=int,
            default=0,
            help='Minute to run notifications (default: 0)'
        )
    
    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'start':
            self.start_scheduler(options)
        elif action == 'stop':
            self.stop_scheduler()
        elif action == 'status':
            self.show_status()
        elif action == 'trigger':
            self.trigger_notifications()
    
    def start_scheduler(self, options):
        """Start the notification scheduler."""
        if is_scheduler_running():
            self.stdout.write(
                self.style.WARNING("Scheduler is already running")
            )
            return
        
        hour = options['hour']
        minute = options['minute']
        
        try:
            scheduler = start_notification_scheduler(hour, minute)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Document notification scheduler started - will run daily at {hour:02d}:{minute:02d}"
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to start scheduler: {str(e)}")
            )
    
    def stop_scheduler(self):
        """Stop the notification scheduler."""
        if not is_scheduler_running():
            self.stdout.write(
                self.style.WARNING("Scheduler is not running")
            )
            return
        
        try:
            stop_notification_scheduler()
            self.stdout.write(
                self.style.SUCCESS("Document notification scheduler stopped")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to stop scheduler: {str(e)}")
            )
    
    def show_status(self):
        """Show scheduler status."""
        scheduler = get_scheduler()
        
        if scheduler and scheduler.running:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Scheduler is RUNNING - scheduled for {scheduler.run_time}"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING("❌ Scheduler is NOT RUNNING")
            )
    
    def trigger_notifications(self):
        """Manually trigger notifications."""
        self.stdout.write("Triggering document notifications manually...")
        
        try:
            trigger_notifications_now()
            self.stdout.write(
                self.style.SUCCESS("✅ Notifications triggered successfully")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Failed to trigger notifications: {str(e)}")
            )