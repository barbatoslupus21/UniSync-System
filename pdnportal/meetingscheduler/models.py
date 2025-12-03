from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone


class MeetingRoom(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    capacity = models.PositiveIntegerField(default=10, help_text="Maximum number of attendees")
    location = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    color = models.CharField(max_length=7, default='#3366ff', help_text="Color code for calendar display")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Meeting Room'
        verbose_name_plural = 'Meeting Rooms'

    def __str__(self):
        return self.name


class MeetingType(models.Model):
    ICON_CHOICES = [
        ('fa-users', 'Project Meeting'),
        ('fa-handshake', 'Meeting'),
        ('fa-phone', 'Call'),
        ('fa-ellipsis-h', 'Other'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, choices=ICON_CHOICES, default='fa-users')
    color = models.CharField(max_length=7, default='#3366ff')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Meeting Type'
        verbose_name_plural = 'Meeting Types'
    
    def __str__(self):
        return self.name


class Meeting(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    room = models.ForeignKey(MeetingRoom, on_delete=models.CASCADE, related_name='meetings')
    meeting_type = models.ForeignKey(MeetingType, on_delete=models.SET_NULL, null=True, blank=True, related_name='meetings')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=200, blank=True, null=True)
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='organized_meetings'
    )
    attendees = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='meeting_invitations',
        blank=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'start_time']
        verbose_name = 'Meeting'
        verbose_name_plural = 'Meetings'

    def __str__(self):
        return f"{self.title} - {self.date} ({self.start_time} - {self.end_time})"

    def clean(self):
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValidationError({
                    'end_time': 'End time must be after start time.'
                })
        
        if self.room and self.date and self.start_time and self.end_time:
            overlapping_meetings = Meeting.objects.filter(
                room=self.room,
                date=self.date,
                status__in=['scheduled', 'in_progress']
            ).exclude(pk=self.pk)
            
            for meeting in overlapping_meetings:
                # Check if times overlap
                if (self.start_time < meeting.end_time and self.end_time > meeting.start_time):
                    raise ValidationError({
                        'start_time': f'This time slot conflicts with "{meeting.title}" ({meeting.start_time.strftime("%H:%M")} - {meeting.end_time.strftime("%H:%M")}) in {self.room.name}.'
                    })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_past(self):
        now = timezone.now()
        meeting_datetime = timezone.make_aware(
            timezone.datetime.combine(self.date, self.end_time)
        )
        return now > meeting_datetime

    @property
    def duration_minutes(self):
        from datetime import datetime, timedelta
        start_dt = datetime.combine(self.date, self.start_time)
        end_dt = datetime.combine(self.date, self.end_time)
        return int((end_dt - start_dt).total_seconds() / 60)

    @classmethod
    def get_meetings_for_date(cls, date, room=None):
        queryset = cls.objects.filter(date=date, status__in=['scheduled', 'in_progress'])
        if room:
            queryset = queryset.filter(room=room)
        return queryset.order_by('start_time')

    @classmethod
    def check_availability(cls, room, date, start_time, end_time, exclude_pk=None):
        queryset = cls.objects.filter(
            room=room,
            date=date,
            status__in=['scheduled', 'in_progress']
        )
        if exclude_pk:
            queryset = queryset.exclude(pk=exclude_pk)
        
        for meeting in queryset:
            if start_time < meeting.end_time and end_time > meeting.start_time:
                return False, meeting
        return True, None
