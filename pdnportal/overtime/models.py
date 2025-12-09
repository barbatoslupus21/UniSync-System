from django.db import models
from django.utils import timezone
from portalusers.models import Users
from django.conf import settings


class ShuttleVehicle(models.Model):
    name = models.CharField(max_length=100)
    capacity = models.PositiveIntegerField(default=13)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (Capacity: {self.capacity})"


class ShuttleProvider(models.Model):
    name = models.CharField(max_length=100)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    contact_number = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Destination(models.Model):
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class DestinationGroup(models.Model):
    name = models.CharField(max_length=100)
    shuttle_vehicle = models.ForeignKey(
        ShuttleVehicle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='destination_groups'
    )
    shuttle_provider = models.ForeignKey(
        ShuttleProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=False,
        related_name='destination_groups'
    )
    destinations = models.ManyToManyField(
        Destination,
        related_name='groups',
        blank=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        vehicle_name = self.shuttle_vehicle.name if self.shuttle_vehicle else "No Vehicle"
        return f"{self.name} - {vehicle_name}"


class UserShuttleAssignment(models.Model):
    employee_id = models.CharField(max_length=200)
    employee_name = models.CharField(max_length=200)
    department = models.CharField(max_length=200, blank=True, null=True)
    line_name = models.CharField(max_length=200, blank=True, null=True)
    destination = models.ForeignKey(
        Destination,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_assignments'
    )
    with_vehicle = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['employee_name']

    def __str__(self):
        return f"{self.employee_name} - {self.destination.name if self.destination else 'Unassigned'}"

class SubordinateGroup(models.Model):
    name = models.CharField(max_length=100)
    created_by = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name='subordinate_groups'
    )
    employee_ids = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['name', 'created_by']

    def __str__(self):
        return f"{self.name} - {self.created_by.name}"


class OvertimeFiling(models.Model):
    FILING_TYPE_CHOICES = [
        ('shifting', 'Shifting'),
        ('daily', 'Daily'),
        ('saturday_off', 'Saturday Off'),
        ('sunday', 'Sunday'),
        ('holiday', 'Holiday'),
    ]

    STATUS_CHOICES = [
        ('not_ot', 'Not OT'),
        ('ot', 'OT'),
        ('absent', 'Absent'),
        ('leave', 'Leave'),
    ]

    SHIFT_CHOICES = [
        ('day', 'Day Shift'),
        ('night', 'Night Shift'),
        ('mid', 'Mid Shift'),
    ]

    filing_type = models.CharField(max_length=20, choices=FILING_TYPE_CHOICES)
    employee_id = models.CharField(max_length=200)
    employee_name = models.CharField(max_length=200)
    department = models.CharField(max_length=200, blank=True, null=True)
    line_name = models.CharField(max_length=200, blank=True, null=True)
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    time_in = models.TimeField()
    time_out = models.TimeField()
    date_from = models.DateField()
    date_to = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ot')
    filed_by = models.ForeignKey(
        Users,
        on_delete=models.SET_NULL,
        null=True,
        related_name='overtime_filings'
    )
    is_late_filing = models.BooleanField(default=False)
    late_filing_approved_by = models.CharField(max_length=200, blank=True, null=True)
    week_number = models.PositiveIntegerField(null=True, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee_name} - {self.filing_type} - {self.date_from}"

    def save(self, *args, **kwargs):
        if self.date_from:
            self.week_number = self.date_from.isocalendar()[1]
            self.year = self.date_from.year
        super().save(*args, **kwargs)


class OvertimePasscode(models.Model):
    passcode = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Passcode (Active: {self.is_active})"


class Holiday(models.Model):
    name = models.CharField(max_length=200)
    date = models.DateField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.name} - {self.date}"
