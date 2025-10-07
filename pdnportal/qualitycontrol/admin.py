from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import LotOutInspection, TrialRunRequest, CutAway


@admin.register(LotOutInspection)
class LotOutInspectionAdmin(admin.ModelAdmin):
    list_display = [
        'rli_number',
        'product_name',
        'product_number',
        'line_affected',
        'requested_by_display',
        'request_date',
        'status',
        'created_at'
    ]
    list_filter = [
        'request_date',
        'line_affected',
        'status',
        'created_at'
    ]
    search_fields = [
        'rli_number',
        'product_name',
        'product_number',
        'line_affected',
        'requested_by__username',
        'requested_by__first_name',
        'requested_by__last_name'
    ]
    readonly_fields = [
        'rli_number',
        'created_at',
        'updated_at'
    ]
    
    fieldsets = (
        ('RLI Information', {
            'fields': ('rli_number',)
        }),
        ('Request Details', {
            'fields': (
                'request_date',
                'requested_by',
                'line_affected',
                'product_number',
                'product_name',
                'reason_for_lot_out',
                'status'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    date_hierarchy = 'request_date'
    ordering = ['-created_at']
    list_per_page = 25
    
    def requested_by_display(self, obj):
        """Display user with full name if available"""
        if obj.requested_by.first_name or obj.requested_by.last_name:
            return f"{obj.requested_by.get_full_name()}"
        return obj.requested_by.username
    requested_by_display.short_description = 'Requested By'
    requested_by_display.admin_order_field = 'requested_by'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('requested_by', 'line')
    
    def save_model(self, request, obj, form, change):
        """Auto-set requested_by if creating new record"""
        if not change and not obj.requested_by_id:
            obj.requested_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TrialRunRequest)
class TrialRunRequestAdmin(admin.ModelAdmin):
    list_display = [
        'trr_number',
        'product_name',
        'product_number',
        'line',
        'trial_date',
        'trial_operator',
        'process_name',
        'status',
        'requested_by_display',
        'created_at'
    ]
    list_filter = [
        'trial_date',
        'line',
        'status',
        'created_at'
    ]
    search_fields = [
        'trr_number',
        'product_name',
        'product_number',
        'process_name',
        'trial_operator',
        'requested_by__username',
        'requested_by__first_name',
        'requested_by__last_name'
    ]
    readonly_fields = [
        'trr_number',
        'created_at',
        'updated_at'
    ]
    
    fieldsets = (
        ('TRR Information', {
            'fields': ('trr_number',)
        }),
        ('Trial Details', {
            'fields': (
                'trial_date',
                'product_name',
                'product_number',
                'line',
                'process_name',
                'trial_operator'
            )
        }),
        ('Change Information', {
            'fields': (
                'change_from',
                'change_to'
            )
        }),
        ('Request Information', {
            'fields': ('requested_by', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    date_hierarchy = 'trial_date'
    ordering = ['-created_at']
    list_per_page = 25
    
    def requested_by_display(self, obj):
        """Display user with full name if available"""
        if obj.requested_by.first_name or obj.requested_by.last_name:
            return f"{obj.requested_by.get_full_name()}"
        return obj.requested_by.username
    requested_by_display.short_description = 'Requested By'
    requested_by_display.admin_order_field = 'requested_by'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('requested_by', 'line')
    
    def save_model(self, request, obj, form, change):
        """Auto-set requested_by if creating new record"""
        if not change and not obj.requested_by_id:
            obj.requested_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CutAway)
class CutAwayAdmin(admin.ModelAdmin):
    list_display = [
        'control_number',
        'product_number',
        'terminal_part_number',
        'assy_line',
        'machine_number',
        'crimped_quantity',
        'schedule_of_cut_away',
        'status_badge',
        'qa_status',
        'created_at'
    ]
    list_filter = [
        'status_of_cut_away',
        'schedule_of_cut_away',
        'date_prepared',
        'assy_line',
        'created_at'
    ]
    search_fields = [
        'control_number',
        'product_number',
        'terminal_part_number',
        'machine_number',
        'applicator_number_code',
        'requested_by__username',
        'requested_by__first_name',
        'requested_by__last_name'
    ]
    readonly_fields = [
        'control_number',
        'created_at',
        'updated_at'
    ]
    
    fieldsets = (
        ('Control Information', {
            'fields': ('control_number', 'status_of_cut_away')
        }),
        ('Cut Away Details', {
            'fields': (
                'date_prepared',
                'assy_line',
                'machine_number',
                'applicator_number_code',
                'crimped_quantity',
                'product_number',
                'terminal_part_number'
            )
        }),
        ('Schedule Information', {
            'fields': (
                'schedule_of_cut_away',
                'received_date_by_qa'
            )
        }),
        ('Request Information', {
            'fields': (
                'requested_by',
                'remarks'
            )
        }),
        ('QA Information', {
            'fields': (
                'qa_inspector',
                'qa_remarks'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    date_hierarchy = 'schedule_of_cut_away'
    ordering = ['-created_at']
    list_per_page = 25
    
    def status_badge(self, obj):
        """Display status with color coding"""
        colors = {
            'pending': '#ffc107',
            'scheduled': '#2196f3',
            'in_progress': '#ff9800',
            'completed': '#4caf50',
            'cancelled': '#f44336'
        }
        color = colors.get(obj.status_of_cut_away, '#666666')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: 500;">{}</span>',
            color,
            obj.get_status_of_cut_away_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status_of_cut_away'
    
    def qa_status(self, obj):
        """Display QA inspection status"""
        if obj.qa_inspector:
            inspector_name = obj.qa_inspector.get_full_name() or obj.qa_inspector.username
            return format_html(
                '<span style="color: #4caf50;">✓ Inspected by {}</span>',
                inspector_name
            )
        if obj.received_date_by_qa:
            return format_html(
                '<span style="color: #ff9800;">Received ({})</span>',
                obj.received_date_by_qa.strftime('%m/%d/%Y')
            )
        return format_html('<span style="color: #999;">Not Received</span>')
    qa_status.short_description = 'QA Status'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('requested_by', 'assy_line', 'qa_inspector')
    
    def save_model(self, request, obj, form, change):
        """Auto-set requested_by if creating new record"""
        if not change and not obj.requested_by_id:
            obj.requested_by = request.user
        super().save_model(request, obj, form, change)

admin.site.site_header = "UniSync Quality Management"
admin.site.site_title = "UniSync Admin"
admin.site.index_title = "Quality Management Dashboard"