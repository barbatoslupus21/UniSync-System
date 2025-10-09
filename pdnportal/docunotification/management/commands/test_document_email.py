"""
Management command to test document notification emails.
Sends test notifications to verify email configuration.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta

from docunotification.models import DocumentNotification, NotificationRecipient
from docunotification.email_service import DocumentNotificationEmailService


class Command(BaseCommand):
    help = 'Test document notification email system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--document-id',
            type=int,
            help='Specific document ID to test'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=0,
            choices=[0, 1, 2],
            help='Simulate notification for X days before due (default: 0 = due today)'
        )
    
    def handle(self, *args, **options):
        """Execute the command."""
        self.stdout.write(
            self.style.SUCCESS("Testing Document Notification Email System")
        )
        self.stdout.write("-" * 60)
        
        service = DocumentNotificationEmailService()
        
        if options['document_id']:
            # Test specific document
            self.test_specific_document(service, options['document_id'], options['days'])
        else:
            # Show all pending notifications
            self.show_pending_notifications(service)
    
    def test_specific_document(self, service, doc_id, days_before):
        """Test email for a specific document."""
        try:
            document = DocumentNotification.objects.get(id=doc_id)
            
            self.stdout.write(f"\n📄 Document: {document.reference_number} - {document.title}")
            self.stdout.write(f"   Due Date: {document.due_date}")
            self.stdout.write(f"   Status: {document.get_status_display()}")
            self.stdout.write(f"   Notification Count: {document.notification_count}")
            
            # Get recipients
            recipients = service.get_notification_recipients(document)
            
            if not recipients:
                self.stdout.write(
                    self.style.WARNING("   ⚠ No email recipients configured!")
                )
                return
            
            self.stdout.write(f"   Recipients: {len(recipients)}")
            for recipient_info in recipients:
                self.stdout.write(f"     - {recipient_info['email']}")
            
            # Ask for confirmation
            confirm = input("\nSend test email to these recipients? (yes/no): ")
            
            if confirm.lower() not in ['yes', 'y']:
                self.stdout.write(self.style.WARNING("Cancelled."))
                return
            
            # Create and send email
            email_content = service.create_email_content(document, days_before)
            
            success_count = 0
            for recipient_info in recipients:
                if service.send_notification_email(document, recipient_info, email_content):
                    success_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"   ✓ Sent to {recipient_info['email']}")
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f"   ✗ Failed to send to {recipient_info['email']}")
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f"\n✅ Successfully sent {success_count}/{len(recipients)} emails")
            )
            
        except DocumentNotification.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Document ID {doc_id} not found!")
            )
    
    def show_pending_notifications(self, service):
        """Show all documents with pending notifications."""
        self.stdout.write("\n📋 Documents with Pending Notifications:\n")
        
        today = date.today()
        
        for days_before in [2, 1, 0]:
            target_date = today + timedelta(days=days_before)
            documents = service.get_documents_for_notification(days_before)
            
            if days_before == 2:
                label = "2 Days Before Due"
            elif days_before == 1:
                label = "1 Day Before Due"
            else:
                label = "Due Today"
            
            self.stdout.write(f"\n{label} ({target_date}):")
            
            if not documents:
                self.stdout.write("  No documents found")
                continue
            
            for doc in documents:
                recipients = service.get_notification_recipients(doc)
                self.stdout.write(
                    f"  • {doc.reference_number} - {doc.title} "
                    f"({len(recipients)} recipients)"
                )
        
        self.stdout.write("\n" + "-" * 60)
        self.stdout.write(
            self.style.HTTP_INFO(
                "\nTo send emails now: python manage.py send_document_notifications"
            )
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                "To test specific document: python manage.py test_document_email --document-id=<ID>"
            )
        )
