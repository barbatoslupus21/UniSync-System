from django.db import models
from portalusers.models import Users
from django.core.exceptions import ValidationError
from django.utils import timezone
from settings.models import Line


class LotOutInspection(models.Model):
    STATUS_CHOICES = [
        ('cancelled', 'Cancelled'),
        ('submitted', 'Submitted'),
    ]

    rli_number = models.CharField(max_length=20, unique=True, editable=False, verbose_name="RLI Number")
    request_date = models.DateField(default=timezone.now, verbose_name="Request Date")
    requested_by = models.ForeignKey(Users, on_delete=models.PROTECT, related_name='lot_out_requests', verbose_name="Requested By")
    product_number = models.CharField(max_length=100, verbose_name="Product Number")
    product_name = models.CharField(max_length=255, verbose_name="Product Name")
    line_affected = models.ForeignKey(Line, on_delete=models.PROTECT, related_name='lot_out_inspections', verbose_name="Line Affected")
    reason_for_lot_out = models.TextField(verbose_name="Reason For Lot Out")
    status = models.CharField(max_length=20,choices=STATUS_CHOICES,default='submitted',verbose_name="Status")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Lot Out Inspection"
        verbose_name_plural = "Lot Out Inspections"
        indexes = [
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.rli_number} - {self.product_name}"
    
    def save(self, *args, **kwargs):
        if not self.rli_number:
            self.rli_number = self._generate_rli_number()
        super().save(*args, **kwargs)
    
    def _generate_rli_number(self):
        last_record = LotOutInspection.objects.order_by('-id').first()
        
        if last_record and last_record.rli_number:
            try:
                last_num = int(last_record.rli_number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1000
        else:
            new_num = 1000
        
        year = timezone.now().year
        return f"RLI-{year}-{new_num:04d}"


class TrialRunRequest(models.Model):

    STATUS_CHOICES = [
        ('cancelled', 'Cancelled'),
        ('submitted', 'Submitted'),
    ]
    
    trr_number = models.CharField(max_length=20,unique=True,editable=False,verbose_name="TRR Number")
    trial_date = models.DateField(verbose_name="Trial Date")
    product_name = models.CharField(max_length=255,verbose_name="Product Name")
    product_number = models.CharField(max_length=100,verbose_name="Product Number")
    line = models.ForeignKey(Line,on_delete=models.PROTECT,related_name='trial_run_requests',verbose_name="Line")
    process_name = models.CharField(max_length=255,verbose_name="Process Name")
    trial_operator = models.CharField(max_length=255,verbose_name="Trial Operator")
    change_from = models.TextField(verbose_name="Change From")
    change_to = models.TextField(verbose_name="Change To")
    requested_by = models.ForeignKey(Users,on_delete=models.PROTECT,related_name='trial_run_requests',verbose_name="Requested By")
    status = models.CharField(max_length=20,choices=STATUS_CHOICES,default='submitted',verbose_name="Status")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Trial Run Request"
        verbose_name_plural = "Trial Run Requests"
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['trial_date']),
        ]
    
    def __str__(self):
        return f"{self.trr_number} - {self.product_name}"
    
    def save(self, *args, **kwargs):
        if not self.trr_number:
            self.trr_number = self._generate_trr_number()
        super().save(*args, **kwargs)
    
    def _generate_trr_number(self):
        last_record = TrialRunRequest.objects.order_by('-id').first()
        
        if last_record and last_record.trr_number:
            try:
                last_num = int(last_record.trr_number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1000
        else:
            new_num = 1000
        
        year = timezone.now().year
        return f"TRR-{year}-{new_num:04d}"


class CutAway(models.Model):

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    control_number = models.CharField(max_length=20,unique=True,editable=False,verbose_name="Control Number")
    date_prepared = models.DateField(default=timezone.now,verbose_name="Date Prepared")
    assy_line = models.ForeignKey(Line,on_delete=models.PROTECT,related_name='cut_aways',verbose_name="Assembly Line")
    machine_number = models.CharField(max_length=100,verbose_name="Machine Number")
    applicator_number_code = models.CharField(max_length=100,verbose_name="Applicator Number/Code")
    crimped_quantity = models.PositiveIntegerField(verbose_name="Crimped Quantity")
    product_number = models.CharField(max_length=100,verbose_name="Product Number")
    terminal_part_number = models.CharField(max_length=100,verbose_name="Terminal Part Number")
    received_date_by_qa = models.DateField(null=True,blank=True,verbose_name="Received Date By QA")
    schedule_of_cut_away = models.DateField(null=True, blank=True, verbose_name="Schedule Of Cut-Away")
    status_of_cut_away = models.CharField(max_length=20,choices=STATUS_CHOICES,default='pending',verbose_name="Status of Cut-Away")
    remarks = models.TextField(blank=True,null=True,verbose_name="Remarks")
    requested_by = models.ForeignKey(Users,on_delete=models.PROTECT,related_name='cut_away_requests',verbose_name="Requested By")
    
    qa_inspector = models.ForeignKey(Users,on_delete=models.SET_NULL,null=True,blank=True,related_name='qa_cut_aways',verbose_name="QA Inspector")
    qa_remarks = models.TextField(blank=True,null=True,verbose_name="QA Remarks")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Cut Away"
        verbose_name_plural = "Cut Aways"
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['schedule_of_cut_away']),
            models.Index(fields=['status_of_cut_away']),
        ]
    
    def __str__(self):
        return f"{self.control_number} - {self.product_number}"
    
    def save(self, *args, **kwargs):
        if not self.control_number:
            self.control_number = self._generate_control_number()
        super().save(*args, **kwargs)
    
    def _generate_control_number(self):
        last_record = CutAway.objects.order_by('-id').first()
        
        if last_record and last_record.control_number:
            try:
                last_num = int(last_record.control_number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1000
        else:
            new_num = 1000
        
        year = timezone.now().year
        return f"CA-{year}-{new_num:04d}"
    
    def clean(self):
        super().clean()
        
        if self.crimped_quantity and self.crimped_quantity <= 0:
            raise ValidationError({
                'crimped_quantity': 'Crimped quantity must be greater than zero.'
            })
        
        if self.schedule_of_cut_away and self.schedule_of_cut_away < timezone.now().date():
            raise ValidationError({
                'schedule_of_cut_away': 'Schedule date cannot be in the past.'
            })