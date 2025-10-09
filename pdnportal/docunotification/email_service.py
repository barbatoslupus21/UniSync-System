"""
Email notification utilities for Document Notification system.
This module handles sending email notifications for document due dates.
"""

import logging
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from .models import DocumentNotification, NotificationRecipient, NotificationHistory

logger = logging.getLogger('docunotification.email')


class DocumentNotificationEmailService:
    """Service class for handling document notification emails."""
    
    def __init__(self):
        self.from_email = settings.DEFAULT_FROM_EMAIL
    
    def get_documents_for_notification(self, days_before: int) -> List[DocumentNotification]:
        """
        Get documents that need notification based on days before due date.
        Only returns documents where the notification has NOT been sent yet.
        
        Args:
            days_before (int): Number of days before due date (2, 1, or 0)
            
        Returns:
            List[DocumentNotification]: Documents needing notification
        """
        target_date = date.today() + timedelta(days=days_before)
        
        # Build filter to check if notification already sent for this stage
        filters = {
            'due_date': target_date,
            'is_active': True,
            'status__in': ['active', 'due_soon']
        }
        
        # Add tracking field filter to avoid duplicate sends
        if days_before == 2:
            filters['notification_sent_2days'] = False
        elif days_before == 1:
            filters['notification_sent_1day'] = False
        else:  # days_before == 0
            filters['notification_sent_duedate'] = False
        
        documents = DocumentNotification.objects.filter(
            **filters
        ).select_related('created_by', 'category').prefetch_related('recipients')
        
        logger.info(f"Found {documents.count()} documents for notification {days_before} days before due")
        return list(documents)
    
    def get_notification_recipients(self, document: DocumentNotification) -> List[Dict[str, Any]]:
        """
        Get all recipients for a document notification.
        
        Args:
            document (DocumentNotification): The document to get recipients for
            
        Returns:
            List[Dict[str, Any]]: List of recipient information
        """
        recipients = []
        
        for recipient in document.recipients.filter(notify_via_email=True):
            email = recipient.email_address or recipient.user.email
            if email:
                recipients.append({
                    'user': recipient.user,
                    'email': email,
                    'is_cc': recipient.is_cc,
                    'cc_email': recipient.cc_email
                })
        
        return recipients
    
    def create_email_content(self, document: DocumentNotification, days_before: int) -> Dict[str, str]:
        """
        Create email subject and content for document notification.
        
        Args:
            document (DocumentNotification): The document
            days_before (int): Days before due date
            
        Returns:
            Dict[str, str]: Email subject and content
        """
        if days_before == 2:
            urgency = "REMINDER"
            message_type = "2 days before due date"
        elif days_before == 1:
            urgency = "URGENT REMINDER"
            message_type = "1 day before due date"
        else:  # days_before == 0
            urgency = "DUE TODAY"
            message_type = "due today"
        
        subject = f"[{urgency}] Document {document.reference_number} - {document.title}"
        
        context = {
            'document': document,
            'days_before': days_before,
            'urgency': urgency,
            'message_type': message_type,
            'due_date': document.due_date,
            'today': date.today()
        }
        
        # Create HTML content
        html_content = render_to_string('docunotification/email/notification_email.html', context)
        
        # Create plain text content
        text_content = f"""
Document Notification - {urgency}

Document Reference: {document.reference_number}
Title: {document.title}
Category: {document.category.name if document.category else 'N/A'}
Due Date: {document.due_date.strftime('%B %d, %Y')}
Status: {message_type.upper()}

Description:
{document.description}

Created by: {document.created_by.get_full_name() if hasattr(document.created_by, 'get_full_name') else document.created_by.username}
Created on: {document.created_date.strftime('%B %d, %Y')}

{'This document is due TODAY. Please take immediate action.' if days_before == 0 else f'This document will be due in {days_before} day(s). Please prepare accordingly.'}

---
This is an automated notification from the PDN Portal Document Notification System.
"""
        
        return {
            'subject': subject,
            'html_content': html_content,
            'text_content': text_content
        }
    
    def send_notification_email(self, document: DocumentNotification, recipient_info: Dict[str, Any], 
                              email_content: Dict[str, str]) -> bool:
        """
        Send notification email to a specific recipient.
        
        Args:
            document (DocumentNotification): The document
            recipient_info (Dict[str, Any]): Recipient information
            email_content (Dict[str, str]): Email content
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            to_emails = [recipient_info['email']]
            cc_emails = []
            
            if recipient_info.get('cc_email'):
                cc_emails.append(recipient_info['cc_email'])
            
            # Create email message
            msg = EmailMultiAlternatives(
                subject=email_content['subject'],
                body=email_content['text_content'],
                from_email=self.from_email,
                to=to_emails,
                cc=cc_emails
            )
            
            # Attach HTML content
            msg.attach_alternative(email_content['html_content'], "text/html")
            
            # Send email
            msg.send()
            
            # Log successful send
            logger.info(f"Email sent successfully to {recipient_info['email']} for document {document.reference_number}")
            
            # Create notification history record
            NotificationHistory.objects.create(
                document=document,
                recipient=recipient_info['user'],
                notification_type='email',
                status='sent',
                subject=email_content['subject'],
                message=email_content['text_content']
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_info['email']} for document {document.reference_number}: {str(e)}")
            
            # Create failed notification history record
            NotificationHistory.objects.create(
                document=document,
                recipient=recipient_info['user'],
                notification_type='email',
                status='failed',
                subject=email_content['subject'],
                message=email_content['text_content'],
                error_message=str(e)
            )
            
            return False
    
    def send_document_notifications(self, days_before: int) -> Dict[str, int]:
        """
        Send notifications for all documents due in specified days.
        
        Args:
            days_before (int): Days before due date (2, 1, or 0)
            
        Returns:
            Dict[str, int]: Summary of notification results
        """
        documents = self.get_documents_for_notification(days_before)
        
        stats = {
            'total_documents': len(documents),
            'total_emails_sent': 0,
            'total_emails_failed': 0,
            'documents_processed': 0
        }
        
        for document in documents:
            recipients = self.get_notification_recipients(document)
            
            if not recipients:
                logger.warning(f"No email recipients found for document {document.reference_number}")
                continue
            
            email_content = self.create_email_content(document, days_before)
            
            document_emails_sent = 0
            for recipient_info in recipients:
                if self.send_notification_email(document, recipient_info, email_content):
                    stats['total_emails_sent'] += 1
                    document_emails_sent += 1
                else:
                    stats['total_emails_failed'] += 1
            
            if document_emails_sent > 0:
                # Update document notification tracking
                document.last_notification_sent = timezone.now()
                document.notification_count += 1
                
                # Mark the appropriate notification stage as sent
                update_fields = ['last_notification_sent', 'notification_count']
                
                if days_before == 2:
                    document.notification_sent_2days = True
                    update_fields.append('notification_sent_2days')
                elif days_before == 1:
                    document.notification_sent_1day = True
                    update_fields.append('notification_sent_1day')
                else:  # days_before == 0
                    document.notification_sent_duedate = True
                    update_fields.append('notification_sent_duedate')
                
                document.save(update_fields=update_fields)
                
                stats['documents_processed'] += 1
        
        logger.info(f"Notification batch complete for {days_before} days before due: {stats}")
        return stats
    
    def send_all_due_date_notifications(self) -> Dict[str, Any]:
        """
        Send all due date notifications (2 days, 1 day, and due today).
        
        Returns:
            Dict[str, Any]: Summary of all notification results
        """
        results = {}
        
        # Send notifications for 2 days before due
        results['2_days_before'] = self.send_document_notifications(2)
        
        # Send notifications for 1 day before due
        results['1_day_before'] = self.send_document_notifications(1)
        
        # Send notifications for due today
        results['due_today'] = self.send_document_notifications(0)
        
        # Calculate totals
        total_stats = {
            'total_documents': sum(r['total_documents'] for r in results.values()),
            'total_emails_sent': sum(r['total_emails_sent'] for r in results.values()),
            'total_emails_failed': sum(r['total_emails_failed'] for r in results.values()),
            'documents_processed': sum(r['documents_processed'] for r in results.values())
        }
        
        results['summary'] = total_stats
        
        logger.info(f"All due date notifications complete: {total_stats}")
        return results


def send_document_due_notifications() -> Dict[str, Any]:
    """
    Convenience function to send all document due notifications.
    
    Returns:
        Dict[str, Any]: Summary of notification results
    """
    service = DocumentNotificationEmailService()
    return service.send_all_due_date_notifications()