from django.db import models
from portalusers.models import Users

class DashboardLayout(models.Model):
    user = models.OneToOneField(Users, on_delete=models.CASCADE, related_name='dashboard_layout')
    layout_data = models.JSONField(default=dict, help_text="Stores widget positions, sizes and configuration")
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Dashboard Layout"

class QuickNote(models.Model):
    user = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='quick_notes')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    widget_id = models.CharField(max_length=100, help_text="ID of the widget this note belongs to")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s note ({self.created_at.strftime('%Y-%m-%d %H:%M')})"

class CalendarEvent(models.Model):
    EVENT_TYPES = (
        ('task', 'Task'),
        ('meeting', 'Meeting'),
        ('reminder', 'Reminder'),
        ('deadline', 'Deadline'),
    )

    PRIORITY_LEVELS = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )

    user = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='calendar_events')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    all_day = models.BooleanField(default=False)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='task')
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    location = models.CharField(max_length=255, blank=True, null=True)
    attendees = models.JSONField(default=list, blank=True, null=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    widget_id = models.CharField(max_length=100, help_text="ID of the widget this event belongs to")

    class Meta:
        ordering = ['start_date']

    def __str__(self):
        return f"{self.title} ({self.start_date.strftime('%Y-%m-%d %H:%M')})"