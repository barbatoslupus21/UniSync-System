from django.db import models
from django.utils import timezone
from portalusers.models import Users
from django.conf import settings

class Employee(models.Model):
    id_number = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    department = models.CharField(max_length=100, blank=True, null=True)
    line = models.CharField(max_length=100, blank=True, null=True)
    shuttle_service = models.CharField(max_length=100, blank=True, null=True)
    date_added = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.id_number} - {self.name}"
    
    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.title()
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-date_added']
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'


class EmployeeGroup(models.Model):
    name = models.CharField(max_length=100)
    employees = models.ManyToManyField(Employee, related_name='groups')
    created_by = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='created_groups')
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-date_updated']
        verbose_name = 'Employee Group'
        verbose_name_plural = 'Employee Groups'


class OTFiling(models.Model):
    FILING_TYPES = (
        ('SHIFTING', 'Shifting OT'),
        ('DAILY', 'Daily OT')
    )
    
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled')
    )
    
    filing_id = models.CharField(max_length=20, unique=True)
    filing_type = models.CharField(max_length=10, choices=FILING_TYPES)
    group = models.ForeignKey(EmployeeGroup, on_delete=models.PROTECT, related_name='ot_filings')
    requestor = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='ot_filings')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.filing_id} - {self.get_filing_type_display()}"
    
    def save(self, *args, **kwargs):
        if not self.filing_id:
            prefix = "SFT" if self.filing_type == "SHIFTING" else "DLY"
            date_str = timezone.now().strftime('%Y%m%d')
            
            today_start = timezone.now().replace(hour=0, minute=0, second=0)
            count = OTFiling.objects.filter(date_created__gte=today_start, filing_type=self.filing_type).count() + 1
            
            self.filing_id = f"{prefix}{date_str}{count:03d}"
        
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-date_created']
        verbose_name = 'OT Filing'
        verbose_name_plural = 'OT Filings'


class ShiftingOT(models.Model):
    filing = models.OneToOneField(OTFiling, on_delete=models.CASCADE, primary_key=True, related_name='shifting_details')
    start_date = models.DateField()
    end_date = models.DateField()
    shift_type = models.CharField(max_length=2, choices=(('AM', 'AM Shift'), ('PM', 'PM Shift')))
    
    def __str__(self):
        return f"{self.filing.filing_id} - {self.shift_type} ({self.start_date} to {self.end_date})"
    
    class Meta:
        verbose_name = 'Shifting OT'
        verbose_name_plural = 'Shifting OTs'


class DailyOT(models.Model):
    SCHEDULE_CHOICES = (
        ('WEEKDAY', 'Weekday'),
        ('SATURDAY', 'Saturday'),
        ('SUNDAY', 'Sunday'),
        ('HOLIDAY', 'Holiday')
    )
    
    filing = models.OneToOneField(OTFiling, on_delete=models.CASCADE, primary_key=True, related_name='daily_details')
    date = models.DateField()
    schedule_type = models.CharField(max_length=10, choices=SCHEDULE_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    reason = models.TextField()
    
    def __str__(self):
        return f"{self.filing.filing_id} - {self.get_schedule_type_display()} ({self.date})"
    
    class Meta:
        verbose_name = 'Daily OT'
        verbose_name_plural = 'Daily OTs'


class EmployeeOTStatus(models.Model):
    STATUS_CHOICES = (
        ('OT', 'OT'),
        ('NOT-OT', 'Not OT'),
        ('ABSENT', 'Absent'),
        ('LEAVE', 'Leave')
    )
    
    filing = models.ForeignKey(OTFiling, on_delete=models.CASCADE, related_name='employee_statuses')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='ot_statuses')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    
    def __str__(self):
        return f"{self.employee.name} - {self.get_status_display()} ({self.filing.filing_id})"
    
    class Meta:
        unique_together = ('filing', 'employee')
        verbose_name = 'Employee OT Status'
        verbose_name_plural = 'Employee OT Statuses'


class LateFilingPassword(models.Model):
    PASSWORD_TYPES = (
        ('SHIFTING', 'Shifting OT Password'),
        ('DAILY', 'Daily OT Password'),
        ('WEEKEND', 'Weekend/Holiday Password'),
        ('HOLIDAY', 'Holiday Filing Password')
    )
    
    password_type = models.CharField(max_length=10, choices=PASSWORD_TYPES, unique=True)
    password = models.CharField(max_length=50)
    last_updated = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name='updated_passwords')
    
    def __str__(self):
        return f"{self.get_password_type_display()}"
    
    class Meta:
        verbose_name = 'Late Filing Password'
        verbose_name_plural = 'Late Filing Passwords'


class SystemActivity(models.Model):
    ACTIVITY_TYPES = (
        ('EXPORT', 'Export'),
        ('PASSWORD', 'Password Change'),
        ('LOGIN', 'Login/Logout'),
        ('OTHER', 'Other')
    )
    
    user = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='system_activities')
    activity_type = models.CharField(max_length=10, choices=ACTIVITY_TYPES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.user.username} ({self.timestamp})"
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'System Activity'
        verbose_name_plural = 'System Activities'