from django.apps import AppConfig
import logging

logger = logging.getLogger('docunotification.email')


class DocunotificationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'docunotification'
    
    def ready(self):
        """
        Initialize the document notification scheduler when Django starts.
        This ensures automatic email notifications are sent daily.
        """
        # Only start scheduler if not in management command or migration
        import sys
        
        # Don't start scheduler during migrations, shell, or specific commands
        if any(cmd in sys.argv for cmd in ['migrate', 'makemigrations', 'shell', 'collectstatic', 'test']):
            return
        
        # Don't start scheduler if this is a management command
        if len(sys.argv) > 1 and sys.argv[1] in ['manage.py'] or 'manage.py' in sys.argv[0]:
            # Check if it's the specific notification command
            if 'send_document_notifications' not in sys.argv:
                return
        
        try:
            from .scheduler import start_notification_scheduler
            
            # Start scheduler to run daily at 8:00 AM
            # You can modify the time by changing these parameters
            scheduler = start_notification_scheduler(run_time_hour=8, run_time_minute=0)
            logger.info("Document notification scheduler initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to start document notification scheduler: {str(e)}")
            # Don't prevent Django from starting if scheduler fails
            pass
