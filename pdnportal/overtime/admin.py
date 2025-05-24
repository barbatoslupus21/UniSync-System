from django.contrib import admin
from .models import (
    Employee, EmployeeGroup, OTFiling, ShiftingOT, 
    DailyOT, EmployeeOTStatus, LateFilingPassword, SystemActivity
)

class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('id_number', 'name', 'department', 'line', 'shuttle_service', 'is_active')
    list_filter = ('department', 'line', 'is_active')
    search_fields = ('id_number', 'name', 'department', 'line')
    list_per_page = 20

class EmployeeGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'date_created', 'employee_count')
    list_filter = ('created_by',)
    search_fields = ('name',)
    
    def employee_count(self, obj):
        return obj.employees.count()
    employee_count.short_description = 'Number of Employees'

class EmployeeOTStatusInline(admin.TabularInline):
    model = EmployeeOTStatus
    extra = 0

class ShiftingOTInline(admin.StackedInline):
    model = ShiftingOT
    can_delete = False

class DailyOTInline(admin.StackedInline):
    model = DailyOT
    can_delete = False

class OTFilingAdmin(admin.ModelAdmin):
    list_display = ('filing_id', 'filing_type', 'group', 'requestor', 'status', 'date_created')
    list_filter = ('filing_type', 'status', 'requestor')
    search_fields = ('filing_id', 'group__name', 'requestor__username')
    readonly_fields = ('filing_id',)
    inlines = [ShiftingOTInline, DailyOTInline, EmployeeOTStatusInline]
    
    def get_inlines(self, request, obj=None):
        if obj is None:
            return []
        
        if obj.filing_type == 'SHIFTING':
            return [ShiftingOTInline, EmployeeOTStatusInline]
        elif obj.filing_type == 'DAILY':
            return [DailyOTInline, EmployeeOTStatusInline]
        
        return super().get_inlines(request, obj)

class LateFilingPasswordAdmin(admin.ModelAdmin):
    list_display = ('get_password_type_display', 'password', 'last_updated', 'updated_by')
    list_filter = ('password_type',)
    
class SystemActivityAdmin(admin.ModelAdmin):
    list_display = ('user', 'activity_type', 'description', 'timestamp')
    list_filter = ('activity_type', 'user', 'timestamp')
    search_fields = ('description', 'user__username')
    readonly_fields = ('user', 'activity_type', 'description', 'timestamp')
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False

admin.site.register(Employee, EmployeeAdmin)
admin.site.register(EmployeeGroup, EmployeeGroupAdmin)
admin.site.register(OTFiling, OTFilingAdmin)
admin.site.register(LateFilingPassword, LateFilingPasswordAdmin)
admin.site.register(SystemActivity, SystemActivityAdmin)