from django.utils import timezone
from datetime import timedelta
from .models import DocumentNotification, NotificationRecipient


def document_notifications(request):
    """
    Context processor to check for document notifications that need user attention.
    Returns notifications for documents that are:
    - Due today, in 1 day, or 2 days
    - User is a recipient with notify_via_system=True
    """
    notifications = []
    user_has_document_due_dates = False
    
    # Only check for authenticated users
    if request.user.is_authenticated:
        today = timezone.now().date()
        
        # Calculate date range: today, tomorrow, and day after tomorrow
        target_dates = [
            today,  # Due today
            today + timedelta(days=1),  # Due in 1 day
            today + timedelta(days=2),  # Due in 2 days
        ]
        
        # Query for document notifications where:
        # 1. User is a recipient
        # 2. notify_via_system is True
        # 3. Due date is within target dates
        # 4. Document is active
        recipients = NotificationRecipient.objects.filter(
            user=request.user,
            notify_via_system=True,
            document__due_date__in=target_dates,
            document__is_active=True
        ).select_related('document', 'document__category', 'document__created_by').distinct()
        
        user_has_document_due_dates = recipients.exists()
        
        # Convert to list of dictionaries for template use
        for recipient in recipients:
            doc = recipient.document
            days_until_due = (doc.due_date - today).days
            
            # Determine urgency level
            if days_until_due == 0:
                urgency = 'Due Today'
                urgency_class = 'urgent'
            elif days_until_due == 1:
                urgency = 'Due Tomorrow'
                urgency_class = 'warning'
            elif days_until_due == 2:
                urgency = 'Due in 2 Days'
                urgency_class = 'info'
            else:
                urgency = f'Due in {days_until_due} days'
                urgency_class = 'info'
            
            notification_data = {
                'id': doc.id,
                'title': doc.title,
                'reference_number': doc.reference_number,
                'category': doc.category.name if doc.category else 'Uncategorized',
                'category_color': doc.category.color_code if doc.category else '#3366ff',
                'description': doc.description,
                'due_date': doc.due_date,
                'days_until_due': days_until_due,
                'urgency': urgency,
                'urgency_class': urgency_class,
                'status': doc.get_status_display(),
                'status_value': doc.status,
                'created_by': doc.created_by.get_full_name() if hasattr(doc.created_by, 'get_full_name') else str(doc.created_by),
            }
            notifications.append(notification_data)
        
        # Sort notifications by urgency (due today first, then tomorrow, then 2 days)
        notifications.sort(key=lambda n: n['days_until_due'])
    
    return {
        'document_notifications': notifications,
        'has_document_notifications': len(notifications) > 0,
        'user_has_document_due_dates': user_has_document_due_dates,
    }
