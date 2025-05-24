from django.db import models
from django.utils import timezone
from portalusers.models import Users

class DCFNumberSetting(models.Model):
    current_number = models.PositiveIntegerField(default=1000)
    prefix = models.CharField(max_length=10, default="DCF-")
    
    def __str__(self):
        return f"{self.prefix}{self.current_number}"
    
    def generate_next_number(self):
        self.current_number += 1
        self.save()
        return f"{self.prefix}{self.current_number-1}"
    
    class Meta:
        verbose_name = "DCF Number Setting"
        verbose_name_plural = "DCF Number Settings"


class DCF(models.Model):
    STATUS_CHOICES = [
        ('on_process', 'On Process'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    NATURE_CHOICES = [
        ('APQP', 'APQP'),
        ('ECC', 'ECC'),
        ('ECIS', 'ECIS'),
        ('ICC', 'ICC'),
        ('Others-PDN', 'Others-PDN'),
        ('Other-QAD', 'Other-QAD'),
    ]

    dcf_number = models.CharField(max_length=50, unique=True)
    requisitioner = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='filed_dcfs')
    prepared_by = models.CharField(max_length=50, blank=True, null=True)
    document_code = models.CharField(max_length=50)
    document_title = models.CharField(max_length=255)
    revision_number = models.CharField(max_length=20)
    nature = models.CharField(max_length=20, choices=NATURE_CHOICES)
    details = models.TextField()
    effectivity_date = models.DateField()
    date_filed = models.DateTimeField(auto_now_add=True)
    date_endorsed = models.DateTimeField(null=True, blank=True)
    received_by = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='on_process')
    date_modified = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.dcf_number} - {self.document_title}"
    
    def save(self, *args, **kwargs):
        if not self.dcf_number:
            dcf_number_setting, created = DCFNumberSetting.objects.get_or_create(pk=1)
            self.dcf_number = dcf_number_setting.generate_next_number()
        super().save(*args, **kwargs)
    
    def get_current_approval_step(self):
        return self.approvals.all().order_by('-date_acted').first()
    
    def is_editable(self):
        return self.status == 'on_process'
    
    def add_approval(self, approver, status, remarks=''):
        return DCFApprovalTimeline.objects.create(
            dcf=self,
            approver=approver,
            status=status,
            remarks=remarks
        )
    
    class Meta:
        verbose_name = "Document Change Form"
        verbose_name_plural = "Document Change Forms"
        ordering = ['-date_filed']


class DCFApprovalTimeline(models.Model):
    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    dcf = models.ForeignKey(DCF, on_delete=models.CASCADE, related_name='approvals')
    approver = models.ForeignKey(Users, on_delete=models.CASCADE)
    date_acted = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    remarks = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.dcf.dcf_number} - {self.status} by {self.approver.name}"
    
    class Meta:
        verbose_name = "DCF Approval Timeline"
        verbose_name_plural = "DCF Approval Timelines"
        ordering = ['date_acted']