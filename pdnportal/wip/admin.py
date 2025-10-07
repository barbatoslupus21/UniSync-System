from django.contrib import admin
from django.utils.html import format_html, mark_safe
from .models import Masterlist, ProductLists, WipMasterlist, Process, InventorySession, InventoryEntry

@admin.register(Masterlist)
class MasterlistAdmin(admin.ModelAdmin):
    list_display = ['material_name', 'description', 'uom', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'updated_at']
    search_fields = ['material_name', 'description']
    list_editable = ['is_active']
    ordering = ['material_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Material Information', {
            'fields': ('material_name', 'description', 'uom', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ProductLists)
class ProductListsAdmin(admin.ModelAdmin):
    list_display = ['product_number', 'description', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'updated_at']
    search_fields = ['product_number', 'description']
    list_editable = ['is_active']
    ordering = ['product_number']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Product Information', {
            'fields': ('product_number', 'description', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(WipMasterlist)
class WipMasterlistAdmin(admin.ModelAdmin):
    list_display = ['product_number', 'material_name', 'cutting_length', 'uom', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'updated_at', 'product_number']
    search_fields = ['product_number__product_number', 'material_name__material_name']
    list_editable = ['is_active']
    ordering = ['product_number__product_number', 'material_name__material_name']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['product_number', 'material_name']
    
    fieldsets = (
        ('WIP Information', {
            'fields': ('product_number', 'material_name', 'is_active')
        }),
        ('Specifications', {
            'fields': ('cutting_length', 'uom')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Process)
class ProcessAdmin(admin.ModelAdmin):
    list_display = ['process_name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['process_name']
    list_editable = ['is_active']
    ordering = ['process_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Process Information', {
            'fields': ('process_name', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(InventorySession)
class InventorySessionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'line', 'person_responsible', 'status', 'completion_percentage_display', 
        'created_by', 'checked_by', 'created_at'
    ]
    list_filter = ['status', 'line', 'created_at', 'checked_at']
    search_fields = ['person_responsible', 'created_by__username', 'checked_by__username', 'notes']
    readonly_fields = [
        'entry_count', 'checked_entry_count', 'pending_entry_count', 
        'completion_percentage', 'created_at', 'checked_at', 'locked_at'
    ]
    ordering = ['-created_at']
    raw_id_fields = ['created_by', 'checked_by']
    
    def completion_percentage_display(self, obj):
        try:
            # Ensure we have a numeric value
            if hasattr(obj, 'completion_percentage'):
                percentage = float(obj.completion_percentage) if obj.completion_percentage is not None else 0.0
            else:
                percentage = 0.0
        except (ValueError, TypeError):
            percentage = 0.0
            
        if percentage == 100:
            color = 'green'
        elif percentage >= 50:
            color = 'orange'
        else:
            color = 'red'
        
        # Use mark_safe with string concatenation instead of format_html
        return mark_safe(f'<span style="color: {color};">{percentage:.1f}%</span>')
    completion_percentage_display.short_description = 'Completion %'
    completion_percentage_display.admin_order_field = 'completion_percentage'
    
    fieldsets = (
        ('Session Information', {
            'fields': ('line', 'person_responsible', 'status', 'notes')
        }),
        ('User Information', {
            'fields': ('created_by', 'checked_by')
        }),
        ('Statistics', {
            'fields': ('entry_count', 'checked_entry_count', 'pending_entry_count', 'completion_percentage'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'checked_at', 'locked_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(InventoryEntry)
class InventoryEntryAdmin(admin.ModelAdmin):
    list_display = [
        'session', 'inventory_type', 'product', 'material', 'process', 
        'count_tag', 'quantity', 'unit_cost', 'total_value_display', 'status', 'created_at'
    ]
    list_filter = [
        'inventory_type', 'status', 'session__line', 'session__status', 
        'created_at', 'product'
    ]
    search_fields = [
        'count_tag', 'product__product_number', 'material__material_name', 
        'process__process_name', 'remarks'
    ]
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'checked_at', 'total_value']
    raw_id_fields = ['session', 'product', 'material', 'process', 'checked_by']
    
    def total_value_display(self, obj):
        try:
            # Ensure we have a numeric value
            if hasattr(obj, 'total_value') and obj.total_value is not None:
                total_value = float(obj.total_value)
                return f"₱{total_value:,.2f}"
            else:
                return "-"
        except (ValueError, TypeError):
            return "-"
    total_value_display.short_description = 'Total Value'
    total_value_display.admin_order_field = 'total_value'
    
    fieldsets = (
        ('Entry Information', {
            'fields': ('session', 'inventory_type', 'count_tag', 'quantity', 'status')
        }),
        ('Product Information', {
            'fields': ('product', 'material', 'process')
        }),
        ('Financial Information', {
            'fields': ('unit_cost', 'total_value'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('remarks',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'checked_at'),
            'classes': ('collapse',)
        }),
        ('Checker Information', {
            'fields': ('checked_by',),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'session', 'session__line', 'product', 'material', 'process', 'checked_by'
        )

# Optional: Inline admins for better UX
class InventoryEntryInline(admin.TabularInline):
    model = InventoryEntry
    extra = 0
    fields = ['inventory_type', 'product', 'material', 'count_tag', 'quantity', 'status']
    readonly_fields = ['created_at']
    raw_id_fields = ['product', 'material']

class WipMasterlistInline(admin.TabularInline):
    model = WipMasterlist
    extra = 0
    fields = ['material_name', 'cutting_length', 'uom', 'is_active']
    raw_id_fields = ['material_name']

class ProcessInline(admin.TabularInline):
    model = Process
    extra = 0
    fields = ['process_name', 'is_active']

# Add inlines to existing admins
ProductListsAdmin.inlines = [WipMasterlistInline]
InventorySessionAdmin.inlines = [InventoryEntryInline]