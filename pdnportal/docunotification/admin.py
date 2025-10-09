from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count, Q
from .models import (
    DocumentCategory,
    DocumentNotification,
    NotificationRecipient,
    NotificationHistory,
    ReminderStage,
    DocumentRenewal,
    DocumentNotificationConfirmation
)

@admin.register(DocumentCategory)
class DocumentCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'color_badge', 'document_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Category Information', {
            'fields': ('name', 'description', 'color_code', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def color_badge(self, obj):
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 4px;">{}</span>',
            obj.color_code,
            obj.name
        )
    color_badge.short_description = 'Color Preview'

    def document_count(self, obj):
        count = obj.documents.count()
        return format_html(
            '<span style="font-weight: bold; color: #3366ff;">{}</span>',
            count
        )
    document_count.short_description = 'Documents'
    document_count.admin_order_field = 'document_count'

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(
            document_count=Count('documents')
        )
        return queryset


class NotificationRecipientInline(admin.TabularInline):
    model = NotificationRecipient
    extra = 1
    # autocomplete_fields = ['user']
    fields = ['user', 'email_address', 'cc_email', 'notify_via_email', 'notify_via_system', 'is_cc', 'added_at']
    readonly_fields = ['added_at']


class ReminderStageInline(admin.TabularInline):
    model = ReminderStage
    extra = 1
    fields = ['days_before_due', 'message_template', 'is_sent', 'sent_at']
    readonly_fields = ['sent_at']


class DocumentRenewalInline(admin.TabularInline):
    model = DocumentRenewal
    extra = 0
    fk_name = 'original_document'
    fields = ['renewed_by', 'renewed_at', 'new_notification_period', 'new_due_date', 'notes']
    readonly_fields = ['renewed_by', 'renewed_at']
    can_delete = False


@admin.register(DocumentNotification)
class DocumentNotificationAdmin(admin.ModelAdmin):
    list_display = [
        'reference_number', 
        'title', 
        'category', 
        'created_by', 
        'status_badge', 
        'days_remaining', 
        'due_date',
        'notification_count',
        'created_date'
    ]
    list_filter = [
        'status', 
        'category', 
        'created_date', 
        'due_date',
        'is_active'
    ]
    search_fields = [
        'title', 
        'reference_number', 
        'description',
        'created_by__username',
        'created_by__first_name',
        'created_by__last_name',
        'category__name'
    ]
    readonly_fields = [
        'created_at', 
        'updated_at', 
        'last_notification_sent',
        'notification_count',
        'days_remaining_display',
        'status_info'
    ]
    # autocomplete_fields = ['created_by']
    date_hierarchy = 'created_date'
    actions = [
        'mark_as_renewed',
        'mark_as_cancelled',
        'send_notification_now',
        'update_all_statuses'
    ]
    
    inlines = [NotificationRecipientInline, ReminderStageInline, DocumentRenewalInline]
    
    fieldsets = (
        ('Document Information', {
            'fields': (
                'title',
                'reference_number',
                'category',
                'description',
                'document_file'
            )
        }),
        ('Creator & Dates', {
            'fields': (
                'created_by',
                'created_date',
            )
        }),
        ('Notification Settings', {
            'fields': (
                'notification_period',
                'due_date',
                'days_remaining_display'
            )
        }),
        ('Status & Tracking', {
            'fields': (
                'status',
                'status_info',
                'last_notification_sent',
                'notification_count',
                'is_active'
            )
        }),
        ('Additional Information', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def status_badge(self, obj):
        colors = {
            'active': '#4caf50',
            'due_soon': '#ffc107',
            'expired': '#f44336',
            'renewed': '#3366ff',
            'cancelled': '#90a4ae'
        }
        icons = {
            'active': '✓',
            'due_soon': '⚠',
            'expired': '✕',
            'renewed': '↻',
            'cancelled': '⊘'
        }
        color = colors.get(obj.status, '#666')
        icon = icons.get(obj.status, '•')
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 12px; '
            'border-radius: 4px; font-weight: 500;">{} {}</span>',
            color,
            icon,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def days_remaining(self, obj):
        days = obj.days_until_due()
        if days < 0:
            color = '#f44336'
            text = f'{abs(days)}d overdue'
            icon = '⚠'
        elif days <= 5:
            color = '#ffc107'
            text = f'{days}d left'
            icon = '⏰'
        else:
            color = '#4caf50'
            text = f'{days}d left'
            icon = '✓'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            color,
            icon,
            text
        )
    days_remaining.short_description = 'Days Remaining'

    def days_remaining_display(self, obj):
        days = obj.days_until_due()
        if days < 0:
            return format_html(
                '<span style="color: #f44336; font-weight: bold; font-size: 16px;">'
                '⚠ {} days overdue</span>',
                abs(days)
            )
        elif days <= 5:
            return format_html(
                '<span style="color: #ffc107; font-weight: bold; font-size: 16px;">'
                '⏰ {} days remaining</span>',
                days
            )
        else:
            return format_html(
                '<span style="color: #4caf50; font-weight: bold; font-size: 16px;">'
                '✓ {} days remaining</span>',
                days
            )
    days_remaining_display.short_description = 'Time Until Due'

    def status_info(self, obj):
        info = []
        
        if obj.is_overdue():
            info.append(format_html(
                '<div style="background: #fbe9e7; padding: 10px; border-radius: 4px; margin-bottom: 10px;">'
                '<strong style="color: #f44336;">⚠ Document is overdue by {} days</strong>'
                '</div>',
                abs(obj.days_until_due())
            ))
        
        if obj.should_send_notification():
            info.append(format_html(
                '<div style="background: #fff8e1; padding: 10px; border-radius: 4px; margin-bottom: 10px;">'
                '<strong style="color: #ffc107;">📧 Notification should be sent</strong>'
                '</div>'
            ))
        
        recipients_count = obj.recipients.count()
        info.append(format_html(
            '<div style="padding: 5px 0;">'
            '<strong>Recipients:</strong> {} (plus creator)'
            '</div>',
            recipients_count
        ))
        
        renewals_count = obj.renewals.count()
        if renewals_count > 0:
            info.append(format_html(
                '<div style="padding: 5px 0;">'
                '<strong>Renewals:</strong> {} time(s)'
                '</div>',
                renewals_count
            ))
        
        return format_html(''.join(info))
    status_info.short_description = 'Status Information'

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('created_by', 'category')
        queryset = queryset.prefetch_related('recipients', 'notification_logs', 'renewals')
        return queryset

    def mark_as_renewed(self, request, queryset):
        updated = queryset.update(status='renewed')
        self.message_user(request, f'{updated} document(s) marked as renewed.')
    mark_as_renewed.short_description = 'Mark selected as Renewed'

    def mark_as_cancelled(self, request, queryset):
        updated = queryset.update(status='cancelled', is_active=False)
        self.message_user(request, f'{updated} document(s) marked as cancelled.')
    mark_as_cancelled.short_description = 'Mark selected as Cancelled'

    def send_notification_now(self, request, queryset):
        from .email_service import DocumentNotificationEmailService
        
        service = DocumentNotificationEmailService()
        total_sent = 0
        total_failed = 0
        
        for doc in queryset:
            recipients = service.get_notification_recipients(doc)
            if recipients:
                # Determine days before due for email content
                days_before = (doc.due_date - timezone.now().date()).days
                days_before = max(0, days_before)  # Don't go negative
                
                email_content = service.create_email_content(doc, days_before)
                
                for recipient_info in recipients:
                    if service.send_notification_email(doc, recipient_info, email_content):
                        total_sent += 1
                    else:
                        total_failed += 1
                
                # Update document tracking
                doc.last_notification_sent = timezone.now()
                doc.notification_count += 1
                doc.save(update_fields=['last_notification_sent', 'notification_count'])
        
        if total_failed > 0:
            self.message_user(request, 
                f'Notifications sent: {total_sent}, Failed: {total_failed}', 
                level='warning')
        else:
            self.message_user(request, 
                f'Successfully sent {total_sent} notification(s).')
    send_notification_now.short_description = 'Send notifications now'

    def update_all_statuses(self, request, queryset):
        count = 0
        for doc in queryset:
            old_status = doc.status
            doc.update_status()
            if old_status != doc.status:
                doc.save()
                count += 1
        self.message_user(request, f'{count} document status(es) updated.')
    update_all_statuses.short_description = 'Update document statuses'


@admin.register(NotificationRecipient)
class NotificationRecipientAdmin(admin.ModelAdmin):
    list_display = [
        'document_ref',
        'user',
        'notify_via_email',
        'notify_via_system',
        'is_cc',
        'added_at'
    ]
    list_filter = [
        'notify_via_email',
        'notify_via_system',
        'is_cc',
        'added_at'
    ]
    search_fields = [
        'document__reference_number',
        'document__title',
        'user__username',
        'user__email',
        'user__first_name',
        'user__last_name'
    ]
    # autocomplete_fields = ['user']
    readonly_fields = ['added_at']
    date_hierarchy = 'added_at'

    def document_ref(self, obj):
        url = reverse('admin:yourapp_documentnotification_change', args=[obj.document.id])
        return format_html(
            '<a href="{}">{}</a>',
            url,
            obj.document.reference_number
        )
    document_ref.short_description = 'Document'
    document_ref.admin_order_field = 'document__reference_number'


@admin.register(NotificationHistory)
class NotificationHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'document_ref',
        'recipient',
        'notification_type',
        'status_badge',
        'sent_at',
        'opened_at',
        'clicked_at'
    ]
    list_filter = [
        'notification_type',
        'status',
        'sent_at',
        'opened_at'
    ]
    search_fields = [
        'document__reference_number',
        'document__title',
        'recipient__username',
        'recipient__email',
        'subject'
    ]
    readonly_fields = [
        'document',
        'recipient',
        'notification_type',
        'sent_at',
        'opened_at',
        'clicked_at'
    ]
    date_hierarchy = 'sent_at'
    
    fieldsets = (
        ('Notification Details', {
            'fields': (
                'document',
                'recipient',
                'notification_type',
                'status'
            )
        }),
        ('Content', {
            'fields': (
                'subject',
                'message'
            )
        }),
        ('Tracking', {
            'fields': (
                'sent_at',
                'opened_at',
                'clicked_at'
            )
        }),
        ('Error Information', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
    )

    def document_ref(self, obj):
        url = reverse('admin:yourapp_documentnotification_change', args=[obj.document.id])
        return format_html(
            '<a href="{}">{}</a>',
            url,
            obj.document.reference_number
        )
    document_ref.short_description = 'Document'
    document_ref.admin_order_field = 'document__reference_number'

    def status_badge(self, obj):
        colors = {
            'sent': '#4caf50',
            'failed': '#f44336',
            'pending': '#ffc107'
        }
        color = colors.get(obj.status, '#666')
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 10px; '
            'border-radius: 4px; font-size: 12px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ReminderStage)
class ReminderStageAdmin(admin.ModelAdmin):
    list_display = [
        'document_ref',
        'days_before_due',
        'is_sent',
        'sent_at',
        'should_send_now',
        'created_at'
    ]
    list_filter = [
        'is_sent',
        'sent_at',
        'created_at'
    ]
    search_fields = [
        'document__reference_number',
        'document__title',
        'message_template'
    ]
    autocomplete_fields = ['document']
    readonly_fields = ['sent_at', 'created_at']
    date_hierarchy = 'created_at'

    def document_ref(self, obj):
        url = reverse('admin:yourapp_documentnotification_change', args=[obj.document.id])
        return format_html(
            '<a href="{}">{}</a>',
            url,
            obj.document.reference_number
        )
    document_ref.short_description = 'Document'

    def should_send_now(self, obj):
        if obj.should_send():
            return format_html(
                '<span style="color: #ffc107; font-weight: bold;">⚠ Yes</span>'
            )
        return format_html(
            '<span style="color: #666;">No</span>'
        )
    should_send_now.short_description = 'Should Send?'


@admin.register(DocumentRenewal)
class DocumentRenewalAdmin(admin.ModelAdmin):
    list_display = [
        'original_document_ref',
        'renewed_by',
        'renewed_at',
        'new_due_date',
        'new_document_link'
    ]
    list_filter = [
        'renewed_at',
        'renewed_by'
    ]
    search_fields = [
        'original_document__reference_number',
        'original_document__title',
        'renewed_by__username',
        'new_document__reference_number',
        'new_document__title'
    ]
    # autocomplete_fields = ['original_document', 'renewed_by']
    readonly_fields = ['renewed_at']
    date_hierarchy = 'renewed_at'

    def original_document_ref(self, obj):
        url = reverse('admin:yourapp_documentnotification_change', args=[obj.original_document.id])
        return format_html(
            '<a href="{}">{}</a>',
            url,
            obj.original_document.reference_number
        )
    original_document_ref.short_description = 'Original Document'

    def new_document_link(self, obj):
        if obj.new_document:
            url = reverse('admin:yourapp_documentnotification_change', args=[obj.new_document.id])
            return format_html(
                '<a href="{}">{}</a>',
                url,
                obj.new_document.reference_number
            )
        return '-'
    new_document_link.short_description = 'New Document'

@admin.register(DocumentNotificationConfirmation)
class DocumentNotificationConfirmationAdmin(admin.ModelAdmin):
    list_display = [
        'document_ref',
        'user_name',
        'confirmed_at'
    ]
    list_filter = [
        'confirmed_at',
        'document__status',
        'document__category'
    ]
    search_fields = [
        'document__reference_number',
        'document__title',
        'user__username',
        'user__first_name',
        'user__last_name'
    ]
    readonly_fields = ['document', 'user', 'confirmed_at']
    date_hierarchy = 'confirmed_at'
    
    def document_ref(self, obj):
        return format_html(
            '<a href="{}">{}</a>',
            reverse('admin:docunotification_documentnotification_change', args=[obj.document.id]),
            obj.document.reference_number
        )
    document_ref.short_description = 'Document'
    
    def user_name(self, obj):
        if hasattr(obj.user, 'get_full_name'):
            full_name = obj.user.get_full_name()
            if full_name:
                return full_name
        return obj.user.username
    user_name.short_description = 'User'
    
    def has_add_permission(self, request):
        # Prevent manual creation of confirmations through admin
        return False
    
    def has_change_permission(self, request, obj=None):
        # Prevent editing confirmations through admin
        return False

admin.site.site_header = "UniSync Document Notification Administration"
admin.site.site_title = "UniSync Admin"
admin.site.index_title = "Document Notification Management"