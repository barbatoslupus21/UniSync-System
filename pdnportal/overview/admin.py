from django.contrib import admin
from .models import DashboardLayout, QuickNote, CalendarEvent

admin.site.register(DashboardLayout)
admin.site.register(QuickNote)
admin.site.register(CalendarEvent)
