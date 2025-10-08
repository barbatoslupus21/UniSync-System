from django.db import models
from django.utils import timezone
from datetime import timedelta
from portalusers.models import Users
from django.core.validators import MinValueValidator


class DocumentCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    color_code = models.CharField(max_length=7, default='#3366ff', help_text="Hex color code for UI")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Document Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class DocumentNotification(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('due_soon', 'Due Soon'),
        ('expired', 'Expired'),
        ('renewed', 'Renewed'),
        ('cancelled', 'Cancelled'),
    ]

    title = models.CharField(max_length=255, help_text="Document title or name")
    reference_number = models.CharField(max_length=100, unique=True, help_text="Unique document reference")
    category = models.ForeignKey(
        DocumentCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='documents'
    )
    description = models.TextField(help_text="Detailed description of the document")

    created_by = models.ForeignKey(
        Users, 
        on_delete=models.CASCADE, 
        related_name='created_documents'
    )
    created_date = models.DateField(default=timezone.now)

    notification_period = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of days from creation date before notification is sent"
    )
    due_date = models.DateField(
        help_text="Calculated date when document is due (created_date + notification_period)"
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    last_notification_sent = models.DateTimeField(blank=True, null=True)
    notification_count = models.IntegerField(default=0, help_text="Number of notifications sent")

    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True, help_text="Internal notes or comments")

    document_file = models.FileField(
        upload_to='document_notifications/%Y/%m/', 
        blank=True, 
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_date', '-created_at']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['reference_number']),
        ]

    def __str__(self):
        return f"{self.reference_number} - {self.title}"

    def save(self, *args, **kwargs):
        if not self.due_date:
            self.due_date = self.created_date + timedelta(days=self.notification_period)
        
        self.update_status()
        
        super().save(*args, **kwargs)

    def update_status(self):
        today = timezone.now().date()
        days_until_due = (self.due_date - today).days
        
        if self.status == 'cancelled' or self.status == 'renewed':
            return
        
        if days_until_due < 0:
            self.status = 'expired'
        elif days_until_due <= 5:
            self.status = 'due_soon'
        else:
            self.status = 'active'

    def days_until_due(self):
        today = timezone.now().date()
        delta = self.due_date - today
        return delta.days

    def is_overdue(self):
        return self.days_until_due() < 0

    def should_send_notification(self):
        today = timezone.now().date()
        return today >= self.due_date and self.status in ['due_soon', 'expired']


class NotificationRecipient(models.Model):
    document = models.ForeignKey(
        DocumentNotification, 
        on_delete=models.CASCADE, 
        related_name='recipients'
    )
    user = models.ForeignKey(Users, on_delete=models.CASCADE, blank=True, null=True)
    email_address = models.EmailField(blank=True, help_text="Custom email address (optional, overrides user email)")
    cc_email = models.EmailField(blank=True, help_text="CC email address")
    notify_via_email = models.BooleanField(default=True)
    notify_via_system = models.BooleanField(default=True)
    is_cc = models.BooleanField(default=False, help_text="CC recipient (not primary)")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['document', 'user']
        ordering = ['added_at']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.document.reference_number}"


class NotificationHistory(models.Model):
    NOTIFICATION_TYPE_CHOICES = [
        ('email', 'Email'),
        ('system', 'System Alert'),
        ('sms', 'SMS'),
    ]

    NOTIFICATION_STATUS_CHOICES = [
        ('sent', 'Sent Successfully'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
    ]

    document = models.ForeignKey(
        DocumentNotification, 
        on_delete=models.CASCADE, 
        related_name='notification_logs'
    )
    recipient = models.ForeignKey(Users, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=NOTIFICATION_STATUS_CHOICES, default='pending')
    
    subject = models.CharField(max_length=255)
    message = models.TextField()
    
    sent_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True, null=True)
    
    opened_at = models.DateTimeField(blank=True, null=True)
    clicked_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Notification Histories"
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['document', 'sent_at']),
            models.Index(fields=['recipient', 'status']),
        ]

    def __str__(self):
        return f"{self.notification_type} - {self.document.reference_number} - {self.sent_at}"


class ReminderStage(models.Model):
    
    document = models.ForeignKey(
        DocumentNotification, 
        on_delete=models.CASCADE, 
        related_name='reminder_stages'
    )
    days_before_due = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text="Days before due date to send reminder (0 = on due date, negative = after)"
    )
    message_template = models.TextField(help_text="Custom message for this reminder stage")
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-days_before_due']
        unique_together = ['document', 'days_before_due']

    def __str__(self):
        return f"{self.document.reference_number} - {self.days_before_due} days before"

    def should_send(self):
        if self.is_sent:
            return False
        
        today = timezone.now().date()
        trigger_date = self.document.due_date - timedelta(days=self.days_before_due)
        return today >= trigger_date


class DocumentRenewal(models.Model):
    original_document = models.ForeignKey(
        DocumentNotification, 
        on_delete=models.CASCADE, 
        related_name='renewals'
    )
    renewed_by = models.ForeignKey(Users, on_delete=models.CASCADE)
    renewed_at = models.DateTimeField(auto_now_add=True)
    
    new_notification_period = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="New notification period for renewed document"
    )
    new_due_date = models.DateField()
    
    notes = models.TextField(blank=True, null=True)
    
    new_document = models.ForeignKey(
        DocumentNotification, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='renewed_from'
    )

    class Meta:
        ordering = ['-renewed_at']

    def __str__(self):
        return f"Renewal of {self.original_document.reference_number} on {self.renewed_at.date()}"