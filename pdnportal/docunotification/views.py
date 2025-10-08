from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from datetime import timedelta
from .models import DocumentNotification, NotificationHistory, NotificationRecipient
from django.db.models import Count, Q
from calendar import monthrange
from django.core.paginator import Paginator
from django.http import JsonResponse
from .forms import DocumentNotificationForm


def compute_docu_stats():
    today = timezone.now().date()
    active_notifications = DocumentNotification.objects.filter(is_active=True).count()
    due_soon_date = today + timedelta(days=7)
    due_soon_count = DocumentNotification.objects.filter(due_date__gte=today, due_date__lte=due_soon_date, is_active=True).count()
    expired_count = DocumentNotification.objects.filter(due_date__gte=today - timedelta(days=7), due_date__lt=today, is_active=True).count()
    total_sent_notifications = NotificationHistory.objects.filter(status='sent').count()

    # Helper to compute month-to-month percentage change (last month -> current month)
    def month_change(model, date_field, filter_kwargs=None):
        filter_kwargs = filter_kwargs or {}
        # current month range
        cur_first = today.replace(day=1)
        cur_last_day = monthrange(today.year, today.month)[1]
        cur_last = today.replace(day=cur_last_day)

        # last month range
        if today.month == 1:
            last_month = 12
            last_year = today.year - 1
        else:
            last_month = today.month - 1
            last_year = today.year
        last_first = cur_first.replace(year=last_year, month=last_month, day=1)
        last_last_day = monthrange(last_year, last_month)[1]
        last_last = last_first.replace(day=last_last_day)

        base_q = model.objects.filter(**filter_kwargs)
        cur_count = base_q.filter(**{f"{date_field}__gte": cur_first, f"{date_field}__lte": cur_last}).count()
        last_count = base_q.filter(**{f"{date_field}__gte": last_first, f"{date_field}__lte": last_last}).count()

        # compute percent change: (cur - last) / last * 100
        if last_count == 0:
            if cur_count == 0:
                pct = 0.0
                increased = False
            else:
                # from 0 to some value -> treat as 100% increase
                pct = 100.0
                increased = True
        else:
            diff = cur_count - last_count
            pct = (diff / last_count) * 100.0
            increased = pct >= 0

        return {
            'current': cur_count,
            'previous': last_count,
            'percent': abs(round(pct, 1)),
            'increased': increased,
        }

    # Compute month-over-month for each metric
    active_mom = month_change(DocumentNotification, 'created_date', {'is_active': True})
    due_soon_mom = month_change(DocumentNotification, 'due_date', {'is_active': True})
    expired_mom = month_change(DocumentNotification, 'due_date', {'is_active': True})
    sent_mom = month_change(NotificationHistory, 'sent_at', {'status': 'sent'})

    return {
        'active_notifications': active_notifications,
        'due_soon_count': due_soon_count,
        'expired_count': expired_count,
        'total_sent_notifications': total_sent_notifications,
        'active_mom': active_mom,
        'due_soon_mom': due_soon_mom,
        'expired_mom': expired_mom,
        'sent_mom': sent_mom,
    }


def docunotification_view(request):
    if request.method == 'POST':
        if 'document_id' in request.POST:  # Edit operation
            document = get_object_or_404(DocumentNotification, id=request.POST['document_id'], created_by=request.user)
            form = DocumentNotificationForm(request.POST, request.FILES, instance=document, user=request.user if request.user.is_authenticated else None)
            if form.is_valid():
                form.save()
                return JsonResponse({'success': True, 'message': 'Document updated successfully!'})
            else:
                errors = {}
                for field, field_errors in form.errors.items():
                    errors[field] = field_errors
                return JsonResponse({'success': False, 'errors': errors})
        else:  # Create operation
            form = DocumentNotificationForm(request.POST, request.FILES, user=request.user if request.user.is_authenticated else None)
            if form.is_valid():
                form.save()
                return JsonResponse({'success': True, 'message': 'Document created successfully!'})
            else:
                errors = {}
                for field, field_errors in form.errors.items():
                    errors[field] = field_errors
                return JsonResponse({'success': False, 'errors': errors})
    
    # GET request - display the page
    stats = compute_docu_stats()
    today = timezone.now().date()
    
    # Get search query
    search_query = request.GET.get('search', '').strip()
    
    # Fetch all active document notifications
    notifications = DocumentNotification.objects.filter(is_active=True, created_by=request.user).select_related('category', 'created_by')
    
    # Apply search filter if search query exists
    if search_query:
        notifications = notifications.filter(
            Q(reference_number__icontains=search_query) |
            Q(title__icontains=search_query) |
            Q(category__name__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(created_by__name__icontains=search_query)
        )
    
    # Categorize and annotate each notification with status class and sort priority
    notification_list = []
    for doc in notifications:
        days_until_due = (doc.due_date - today).days
        
        # Determine status class and priority for sorting
        if days_until_due < 0:
            status_class = 'expired'
            priority = 1
            status_text = 'Expired'
        elif days_until_due <= 3:
            status_class = 'due-soon'
            priority = 2
            status_text = f'Due in {days_until_due} day{"s" if days_until_due != 1 else ""}'
        elif days_until_due <= 7:
            status_class = 'due-week'
            priority = 3
            status_text = f'Due in {days_until_due} days'
        else:
            status_class = 'due-later'
            priority = 4
            status_text = f'Due in {days_until_due} days'
        
        notification_list.append({
            'doc': doc,
            'status_class': status_class,
            'status_text': status_text,
            'priority': priority,
            'days_until_due': days_until_due,
        })
    
    # Sort by priority (expired first) then by days until due
    notification_list.sort(key=lambda x: (x['priority'], x['days_until_due']))
    
    # Filter for Recent Notifications (right column): only show documents that are:
    # 1. Not expired yet, OR
    # 2. Expired but within the last 7 days
    recent_notifications = [
        item for item in notification_list
        if item['days_until_due'] >= -7  # -7 means expired 7 days ago
    ]
    
    # Paginate with 10 per page
    paginator = Paginator(notification_list, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Handle AJAX search requests
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        search_results = []
        for item in page_obj:
            # try to get first recipient for the document
            try:
                first_recipient = item['doc'].recipients.first()
                rec_email = first_recipient.email_address if first_recipient else ''
                rec_cc = first_recipient.cc_email if first_recipient else ''
            except Exception:
                rec_email = ''
                rec_cc = ''

            search_results.append({
                'id': item['doc'].id,
                'reference_number': item['doc'].reference_number,
                'title': item['doc'].title,
                'category': item['doc'].category.name if item['doc'].category else 'Uncategorized',
                'due_date': item['doc'].due_date.strftime('%M %d, %Y'),
                'status_text': item['status_text'],
                'status_class': item['status_class'],
                'description': item['doc'].description,
                'notes': item['doc'].notes,
                'notification_period': item['doc'].notification_period,
                'created_by': item['doc'].created_by.name,
                'created_at': item['doc'].created_at.strftime('%M %d, %Y'),
                'email': rec_email,
                'cc_email': rec_cc,
                'can_edit': item['doc'].created_by == request.user,
            })
        
        return JsonResponse({
            'results': search_results,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
            'total_count': paginator.count,
        })
    
    context = {
        'active_notifications': stats['active_notifications'],
        'due_soon_count': stats['due_soon_count'],
        'expired_count': stats['expired_count'],
        'total_sent_notifications': stats['total_sent_notifications'],
        'active_mom': stats['active_mom'],
        'due_soon_mom': stats['due_soon_mom'],
        'expired_mom': stats['expired_mom'],
        'sent_mom': stats['sent_mom'],
        'notifications': recent_notifications,  # For the Recent Notifications section (right column)
        'page_obj': page_obj,  # For the paginated table (left column)
        'form': DocumentNotificationForm(user=request.user),
        'search_query': search_query,
    }
    
    return render(request, 'docunotification/docunotification.html', context)


def delete_document(request, document_id):
    if request.method == 'POST':
        document = get_object_or_404(DocumentNotification, id=document_id, created_by=request.user)
        document.delete()
        return JsonResponse({'success': True, 'message': 'Document deleted successfully!'})
    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


def document_notifications_api(request):

    notifications = []
    
    if request.user.is_authenticated:
        today = timezone.now().date()
        
        target_dates = [
            today,  # Due today
            today + timedelta(days=1),  # Due in 1 day
            today + timedelta(days=2),  # Due in 2 days
        ]
        
        recipients = NotificationRecipient.objects.filter(
            user=request.user,
            notify_via_system=True,
            document__due_date__in=target_dates,
            document__is_active=True
        ).select_related('document', 'document__category', 'document__created_by').distinct()
        
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
                'due_date': doc.due_date.strftime('%Y-%m-%d'),
                'days_until_due': days_until_due,
                'urgency': urgency,
                'urgency_class': urgency_class,
                'status': doc.get_status_display(),
                'status_value': doc.status,
                'created_by': doc.created_by.get_full_name() if hasattr(doc.created_by, 'get_full_name') else str(doc.created_by),
            }
            notifications.append(notification_data)
        
        notifications.sort(key=lambda n: n['days_until_due'])
    
    return JsonResponse({
        'success': True,
        'notifications': notifications,
        'count': len(notifications)
    })
