from django.contrib import admin
from .models import (
    ShuttleVehicle,
    DestinationGroup,
    UserShuttleAssignment,
    SubordinateGroup,
    OvertimeFiling,
    OvertimePasscode,
    Holiday
)


@admin.register(ShuttleVehicle)
class ShuttleVehicleAdmin(admin.ModelAdmin):
    list_display = ['name', 'capacity', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['name']


@admin.register(DestinationGroup)
class DestinationGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'shuttle_vehicle', 'is_active', 'created_at']
    list_filter = ['is_active', 'shuttle_vehicle']
    search_fields = ['name']
    ordering = ['name']


@admin.register(UserShuttleAssignment)
class UserShuttleAssignmentAdmin(admin.ModelAdmin):
    list_display = ['employee_name', 'employee_id', 'department', 'line_name', 'destination', 'updated_at']
    list_filter = ['destination', 'department']
    search_fields = ['employee_name', 'employee_id', 'department', 'line_name']
    ordering = ['employee_name']


@admin.register(SubordinateGroup)
class SubordinateGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_by']
    search_fields = ['name', 'created_by__name']
    ordering = ['-created_at']


@admin.register(OvertimeFiling)
class OvertimeFilingAdmin(admin.ModelAdmin):
    list_display = ['employee_name', 'filing_type', 'shift', 'date_from', 'date_to', 'status', 'filed_by', 'is_late_filing', 'created_at']
    list_filter = ['filing_type', 'status', 'shift', 'is_late_filing', 'filed_by']
    search_fields = ['employee_name', 'employee_id', 'department', 'line_name']
    ordering = ['-created_at']
    date_hierarchy = 'date_from'


@admin.register(OvertimePasscode)
class OvertimePasscodeAdmin(admin.ModelAdmin):
    list_display = ['passcode', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active']


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['date']
    date_hierarchy = 'date'
