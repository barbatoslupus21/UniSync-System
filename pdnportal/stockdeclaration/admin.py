from django.contrib import admin
from .models import StockDeclaration


@admin.register(StockDeclaration)
class StockDeclarationAdmin(admin.ModelAdmin):
    # Display fields in the list view
    list_display = [
        'control_number',
        'get_lines_display',
        'stock_type',
        'status',
        'product_number',
        'product_name',
        'quantity',
        'created_at',
        'created_by'
    ]

    # Fields to filter by in the right sidebar
    list_filter = [
        'stock_type',
        'status',
        'created_at',
        'lines'
    ]

    # Fields to search by
    search_fields = [
        'control_number',
        'product_number',
        'product_name',
        'created_by__name'
    ]

    # Fields that are read-only
    readonly_fields = [
        'control_number',
        'created_at',
        'updated_at',
        'date_received_by_production'
    ]

    # Fieldsets for organizing the form
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'control_number',
                'lines',
                'stock_type'
            )
        }),
        ('Product Details', {
            'fields': (
                'product_number',
                'product_name',
                'quantity'
            )
        }),
        ('Status & Transit', {
            'fields': (
                'status',
                'in_transit',
                'received_by_production',
                'date_received_by_production'
            )
        }),
        ('Metadata', {
            'fields': (
                'created_by',
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        })
    )

    # Ordering in the list view
    ordering = ['-created_at']

    # Methods for custom display
    def get_lines_display(self, obj):
        """Display all associated lines as a comma-separated string"""
        return ", ".join([line.line_name for line in obj.lines.all()])
    get_lines_display.short_description = 'Production Lines'

    # Actions
    actions = ['mark_as_arrived', 'mark_as_cancelled']

    def mark_as_arrived(self, request, queryset):
        """Mark selected declarations as arrived"""
        updated = queryset.update(status='arrived')
        self.message_user(
            request,
            f'Successfully marked {updated} stock declaration(s) as arrived.'
        )
    mark_as_arrived.short_description = 'Mark selected declarations as arrived'

    def mark_as_cancelled(self, request, queryset):
        """Mark selected declarations as cancelled"""
        updated = queryset.update(status='cancelled')
        self.message_user(
            request,
            f'Successfully marked {updated} stock declaration(s) as cancelled.'
        )
    mark_as_cancelled.short_description = 'Mark selected declarations as cancelled'

    # Override save_model to set created_by if not set
    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
