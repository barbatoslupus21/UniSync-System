from django.db import models
from django.utils import timezone
from portalusers.models import Users
from django.conf import settings

class ECIS(models.Model):
    CATEGORY_CHOICES = [
        ('OR', 'Customer / Complaint Countermeasure'),
        ('YE', 'Yokodoshi'),
        ('PN', 'Manpower Related'),
        ('LG', 'Productivity / Tooling Improvement'),
        ('GR', 'Customer Request'),
        ('L', 'Material Related'),
        ('GY', 'Machine Related'),
    ]

    STATUS_CHOICES = [
        ('Approved', 'Approved'),
        ('On Hold', 'On Hold'),
        ('For Review', 'For Review'),
        ('Needs Revision', 'Needs Revision'),
        ('Canceled', 'Canceled'),
    ]

    category = models.CharField(max_length=2, choices=CATEGORY_CHOICES)
    number = models.CharField(max_length=12, unique=True)
    date_prepared = models.DateField(auto_now_add=True)
    department = models.CharField(max_length=100)
    requested_by = models.CharField(max_length=100)
    customer = models.CharField(max_length=100, blank=True)
    line_supervisor = models.CharField(max_length=100, blank=True)
    affected_parts = models.TextField()
    details_change = models.TextField()
    implementation_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Approved')
    facilitator_remarks = models.TextField(blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='ecis_created')

    def __str__(self):
        return self.number

    class Meta:
        verbose_name = "ECIS"
        verbose_name_plural = "ECIS"
        ordering = ['-last_updated']


class CategoryCounter(models.Model):
    category = models.CharField(max_length=2, unique=True)
    current_sequence = models.PositiveIntegerField(default=1)
    year = models.CharField(max_length=2)

    def __str__(self):
        return f"{self.category} - {self.year} - {self.current_sequence}"

    class Meta:
        unique_together = ('category', 'year')