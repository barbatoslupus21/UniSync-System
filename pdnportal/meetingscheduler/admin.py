from django.contrib import admin
from .models import MeetingRoom, MeetingType, Meeting


@admin.register(MeetingRoom)
class MeetingRoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'capacity', 'location', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description', 'location')
    ordering = ('name',)
    list_editable = ('is_active',)


@admin.register(MeetingType)
class MeetingTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'color', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name',)
    ordering = ('name',)
    list_editable = ('is_active',)


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ('title', 'room', 'date', 'start_time', 'end_time', 'organizer', 'status', 'created_at')
    list_filter = ('status', 'room', 'meeting_type', 'date', 'created_at')
    search_fields = ('title', 'description', 'organizer__name', 'organizer__username')
    ordering = ('-date', '-start_time')
    date_hierarchy = 'date'
    filter_horizontal = ('attendees',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Meeting Details', {
            'fields': ('title', 'description', 'meeting_type', 'status')
        }),
        ('Schedule', {
            'fields': ('room', 'date', 'start_time', 'end_time', 'location')
        }),
        ('Participants', {
            'fields': ('organizer', 'attendees')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
