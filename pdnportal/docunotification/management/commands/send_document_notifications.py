"""
Django management command to send document due date notifications.
This command checks for documents that are due in 2 days, 1 day, or due today
and sends email notifications to the configured recipients.
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import date
import logging

from docunotification.email_service import DocumentNotificationEmailService

logger = logging.getLogger('docunotification.email')


class Command(BaseCommand):
    help = 'Send email notifications for documents due in 2 days, 1 day, or due today'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            choices=[0, 1, 2],
            help='Send notifications for documents due in specific days (0=today, 1=tomorrow, 2=in 2 days)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending emails'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output'
        )
    
    def handle(self, *args, **options):
        """Execute the command."""
        start_time = timezone.now()
        
        if options['verbose']:
            self.stdout.write(
                self.style.SUCCESS(f"Starting document notification check at {start_time}")
            )
        
        try:
            service = DocumentNotificationEmailService()
            
            if options['dry_run']:
                self.run_dry_run(service, options)
            else:
                self.run_notifications(service, options)
                
        except Exception as e:
            logger.error(f"Command execution failed: {str(e)}")
            raise CommandError(f"Failed to send notifications: {str(e)}")
        
        end_time = timezone.now()
        duration = (end_time - start_time).total_seconds()
        
        if options['verbose']:
            self.stdout.write(
                self.style.SUCCESS(f"Command completed in {duration:.2f} seconds")
            )
    
    def run_dry_run(self, service, options):
        """Run in dry-run mode to show what would be sent."""
        self.stdout.write(self.style.WARNING("DRY RUN MODE - No emails will be sent"))
        self.stdout.write("-" * 60)
        
        days_to_check = [options['days']] if options['days'] is not None else [2, 1, 0]
        
        total_documents = 0
        total_recipients = 0
        
        for days_before in days_to_check:
            documents = service.get_documents_for_notification(days_before)
            
            if days_before == 2:
                urgency = "REMINDER (2 days before due)"
            elif days_before == 1:
                urgency = "URGENT REMINDER (1 day before due)"
            else:
                urgency = "DUE TODAY"
            
            self.stdout.write(
                self.style.HTTP_INFO(f"\n{urgency}:")
            )
            
            if not documents:
                self.stdout.write("  No documents found")
                continue
            
            for document in documents:
                recipients = service.get_notification_recipients(document)
                
                self.stdout.write(f"  📄 {document.reference_number} - {document.title}")
                self.stdout.write(f"     Due: {document.due_date}")
                self.stdout.write(f"     Recipients: {len(recipients)}")
                
                if options['verbose']:
                    for recipient in recipients:
                        email = recipient['email']
                        cc_info = f" (CC: {recipient['cc_email']})" if recipient.get('cc_email') else ""
                        self.stdout.write(f"       ✉️  {email}{cc_info}")
                
                total_documents += 1
                total_recipients += len(recipients)
        
        self.stdout.write("-" * 60)
        self.stdout.write(
            self.style.SUCCESS(
                f"Summary: {total_documents} documents, {total_recipients} total recipients"
            )
        )
    
    def run_notifications(self, service, options):
        """Run the actual notification sending."""
        if options['days'] is not None:
            # Send notifications for specific days
            days_before = options['days']
            results = service.send_document_notifications(days_before)
            self.display_results({f"{days_before}_days_before": results}, options)
        else:
            # Send all notifications
            results = service.send_all_due_date_notifications()
            self.display_results(results, options)
    
    def display_results(self, results, options):
        """Display the results of notification sending."""
        self.stdout.write(self.style.SUCCESS("Document Notification Results"))
        self.stdout.write("=" * 60)
        
        # Display individual categories
        for category, stats in results.items():
            if category == 'summary':
                continue
                
            category_name = self.format_category_name(category)
            self.stdout.write(f"\n{category_name}:")
            
            if stats['total_documents'] == 0:
                self.stdout.write("  No documents found")
                continue
            
            self.stdout.write(f"  📄 Documents found: {stats['total_documents']}")
            self.stdout.write(f"  📧 Documents processed: {stats['documents_processed']}")
            self.stdout.write(f"  ✅ Emails sent: {stats['total_emails_sent']}")
            
            if stats['total_emails_failed'] > 0:
                self.stdout.write(
                    self.style.ERROR(f"  ❌ Emails failed: {stats['total_emails_failed']}")
                )
        
        # Display summary if available
        if 'summary' in results:
            summary = results['summary']
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write(self.style.SUCCESS("SUMMARY:"))
            self.stdout.write(f"📄 Total documents: {summary['total_documents']}")
            self.stdout.write(f"📧 Documents processed: {summary['documents_processed']}")
            self.stdout.write(f"✅ Total emails sent: {summary['total_emails_sent']}")
            
            if summary['total_emails_failed'] > 0:
                self.stdout.write(
                    self.style.ERROR(f"❌ Total emails failed: {summary['total_emails_failed']}")
                )
            
            # Calculate success rate
            if summary['total_emails_sent'] + summary['total_emails_failed'] > 0:
                success_rate = (summary['total_emails_sent'] / 
                              (summary['total_emails_sent'] + summary['total_emails_failed'])) * 100
                self.stdout.write(f"📊 Success rate: {success_rate:.1f}%")
        
        self.stdout.write("=" * 60)
        
        # Log the results
        if 'summary' in results:
            logger.info(f"Notification batch completed: {results['summary']}")
        else:
            logger.info(f"Notification batch completed: {list(results.values())[0]}")
    
    def format_category_name(self, category):
        """Format category names for display."""
        category_map = {
            '2_days_before': '📅 2 Days Before Due',
            '1_day_before': '⚠️  1 Day Before Due (Urgent)',
            'due_today': '🚨 Due Today (Critical)',
            '0_days_before': '🚨 Due Today (Critical)'
        }
        return category_map.get(category, category.replace('_', ' ').title())