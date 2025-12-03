from django.contrib import admin
from .models import GreenControlNumber, YellowControlNumber, WhiteControlNumber, OrangeControlNumber, JOLogsheet, JORouting

@admin.register(GreenControlNumber)
class GreenControlNumberAdmin(admin.ModelAdmin):
    list_display = ('prepared_by',)
    search_fields = ('prepared_by__name',)

@admin.register(YellowControlNumber)
class YellowControlNumberAdmin(admin.ModelAdmin):
    list_display = ('prepared_by',)
    search_fields = ('prepared_by__name',)

@admin.register(WhiteControlNumber)
class WhiteControlNumberAdmin(admin.ModelAdmin):
    list_display = ('prepared_by',)
    search_fields = ('prepared_by__name',)

@admin.register(OrangeControlNumber)
class OrangeControlNumberAdmin(admin.ModelAdmin):
    list_display = ('prepared_by',)
    search_fields = ('prepared_by__name',)

class JORoutingInline(admin.TabularInline):
    model = JORouting
    extra = 0
    readonly_fields = ('approver', 'status', 'request_at', 'approved_at', 'remarks')
    can_delete = False
    fields = ('approver', 'status', 'request_at', 'approved_at', 'remarks')
    verbose_name = 'Routing'
    verbose_name_plural = 'Routing History'

@admin.register(JOLogsheet)
class JOLogsheetAdmin(admin.ModelAdmin):
    list_display = ('jo_number', 'prepared_by', 'requestor', 'jo_color', 'status', 'date_created')
    list_filter = ('status', 'jo_color', 'date_created')
    search_fields = ('jo_number', 'requestor', 'prepared_by__name')
    ordering = ('-date_created',)
    inlines = [JORoutingInline]

@admin.register(JORouting)
class JORoutingAdmin(admin.ModelAdmin):
    list_display = ('jo_request', 'approver', 'status', 'request_at', 'approved_at')
    list_filter = ('status', 'request_at', 'approved_at')
    search_fields = ('jo_request__jo_number', 'approver__name')
    ordering = ('-request_at',)
