from django.db import models
from django.utils import timezone
from portalusers.models import Users
from settings.models import Line
from django.db import models
from django.db.models import Sum, F
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from settings.models import Line

class Monitoring(models.Model):
    STATUS_CHOICES = (
        ('Running', 'Running'),
        ('On Hold', 'On Hold'),
        ('Stopped', 'Stopped')
    )

    created_by = models.ForeignKey(Users, on_delete=models.CASCADE)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Running')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.title} by {self.created_by}'
    
    @property
    def efficiency_percentage(self):
        today = timezone.now().date()
        today_schedules = self.monitoring_schedule.filter(date_planned=today)
        
        if not today_schedules.exists():
            return 0
        
        total_planned = today_schedules.aggregate(total=Sum('planned_qty'))['total'] or 0
        
        today_outputs = ProductionOutput.objects.filter(
            schedule_plan__in=today_schedules,
            recorded_at__date=today
        )
        
        total_produced = today_outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0
        
        if total_planned == 0:
            return 0
            
        return round((total_produced / total_planned) * 100)

    class Meta:
        ordering = ['status', '-created_at']

class SupervisorToMonitor(models.Model):
    monitoring = models.ForeignKey(Monitoring, on_delete=models.CASCADE, related_name="monitoring_supervisors")
    supervisor = models.ForeignKey(Users, on_delete=models.CASCADE, related_name="assigned_supervisors")

    def __str__(self):
        return f'{self.monitoring.title} - {self.supervisor.username}'
    
class LineToMonitor(models.Model):
    monitoring = models.ForeignKey(Monitoring, on_delete=models.CASCADE, related_name="monitoring_lines")
    line = models.ForeignKey(Line, on_delete=models.CASCADE, related_name="assigned_lines")

    def __str__(self):
        return f'{self.monitoring.title} - {self.line.line_name}'
    
class Product(models.Model):
    monitoring = models.ForeignKey(Monitoring, on_delete=models.CASCADE, related_name='monitoring_product')
    product_name = models.CharField(max_length=100)
    line = models.ForeignKey(Line, on_delete=models.CASCADE, related_name='product_line')
    description = models.TextField(blank=True)
    qty_per_box = models.IntegerField()
    qty_per_hour = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product_name} - {self.description}: {self.line.line_name}"

class ProductionSchedulePlan(models.Model):
    STATUS_CHOICES = (
        ('Planned', 'Planned'),
        ('Change Load', 'Change Load'),
        ('Backlog', 'Backlog')
    )
    
    SHIFT_CHOICES = (
        ('AM', 'AM'),
        ('PM', 'PM')
    )
    
    monitoring = models.ForeignKey(Monitoring, on_delete=models.CASCADE, related_name='monitoring_schedule')
    date_planned = models.DateField()
    product_number = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_schedule')
    shift = models.CharField(max_length=2, choices=SHIFT_CHOICES, default='AM')
    planned_qty = models.IntegerField(default=0)
    balance = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planned')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f'{self.date_planned} - {self.product_number.product_name} : {self.product_number.line.line_name} - {self.shift}'

    def save(self, *args, **kwargs):
        if not self.pk:
            return super().save(*args, **kwargs)

        outputs = self.outputs.all()
        total_produced = outputs.aggregate(total=Sum('quantity_produced'))['total'] or 0
        self.balance = self.planned_qty - total_produced
        
        super().save(*args, **kwargs)


class ProductionOutput(models.Model):
    SHIFT_CHOICES = (
        ('AM', 'AM'),
        ('PM', 'PM')
    )
    
    monitoring = models.ForeignKey(Monitoring, on_delete=models.CASCADE, related_name='outputs')
    schedule_plan = models.ForeignKey(ProductionSchedulePlan, on_delete=models.CASCADE, related_name='outputs')
    line = models.ForeignKey(Line, on_delete=models.CASCADE, related_name='output_line', null=True)
    shift = models.CharField(max_length=2, choices=SHIFT_CHOICES, default="AM")
    inspector = models.CharField(max_length=500, null=True, blank=True)
    quantity_produced = models.IntegerField(default=0)
    recorded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.line.line_name}: {self.shift} - {self.recorded_at} - Output: {self.quantity_produced}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.schedule_plan.save()

        RecentActivity.objects.create(
            monitoring=self.monitoring,
            title=f"Output Recorded - {self.line.line_name}",
            description=f"{self.quantity_produced} units recorded for {self.schedule_plan.product_number.product_name}",
            activity_type='success',
            shift=self.shift
        )

    class Meta:
        ordering = ['-recorded_at']

class OutputLog(models.Model):
    STATUS_CHOICES = (
        ('Met', 'Met'),
        ('Not Met', 'Not Met')
    )
    outputlog = models.ForeignKey(ProductionOutput, on_delete=models.CASCADE, related_name='production_output')
    output = models.IntegerField(default=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, null=True)
    time_recorded = models.DateTimeField(auto_now_add=True)
    # time_recorded = models.DateTimeField(null=True, blank=True)

    def __str__(self):
          return f'{self.time_recorded} - {self.outputlog.line}: {self.output}'

    class Meta:
        ordering = ['outputlog__line__line_name', '-time_recorded']

class RecentActivity(models.Model):
    ACTIVITY_TYPE_CHOICES = (
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('info', 'Info')
    )
    
    SHIFT_CHOICES = (
        ('AM', 'AM'),
        ('PM', 'PM')
    )
    
    monitoring = models.ForeignKey(Monitoring, on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    title = models.CharField(max_length=100)
    description = models.TextField()
    activity_type = models.CharField(max_length=10, choices=ACTIVITY_TYPE_CHOICES, default='info')
    shift = models.CharField(max_length=2, choices=SHIFT_CHOICES, default='AM')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f'{self.title} - {self.created_at}'
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Recent Activities'


# WorkCenter
class WorkCenter(models.Model):
    monitoring = models.ForeignKey(Monitoring, on_delete=models.CASCADE, related_name='monitoring_workcenter')
    work_center = models.CharField(max_length=100)
    line = models.ForeignKey(Line, on_delete=models.CASCADE, related_name='work_center_line')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.work_center} - {self.line.line_name}"
    
class ProductionSheetManpower(models.Model):
    line_user = models.ForeignKey(Users, on_delete=models.CASCADE, related_name="user_line_inspector", null=True)
    assigned_mp = models.CharField(max_length=200, null=True)
    work_center = models.ForeignKey(WorkCenter, on_delete=models.CASCADE, related_name='work_center_mp')

    def __str__(self):
        return f"{self.assigned_mp} - {self.work_center}"
    
class ProductionSheet(models.Model):
    SHIFT_CHOICES = (
        ('AM', 'AM'),
        ('PM', 'PM')
    )
    
    prepared_by = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='sheets_preparer')
    verified_by = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='sheets_verifier')
    monitoring_schedule = models.ForeignKey('ProductionSchedulePlan', on_delete=models.CASCADE, related_name='schedule_sheets')
    shift = models.CharField(max_length=2, choices=SHIFT_CHOICES, default='AM')
    total_output = models.IntegerField(default=0)
    manpower = models.ManyToManyField('ProductionSheetManpower', related_name='sheet_manpower')
    date_prepared = models.DateField(auto_now_add=True)
    date_verified = models.DateField(auto_now=True)

    def __str__(self):
        return f"{self.prepared_by} - {self.monitoring_schedule.monitoring.title}"


class HourlyOutput(models.Model):
    production_sheet = models.ForeignKey('ProductionSheet', on_delete=models.CASCADE, related_name='hourly_outputs')
    time_hourly = models.TimeField(null=True)
    target = models.IntegerField()
    actual = models.IntegerField()
    
    def __str__(self):
        return f"{self.production_sheet} @ {self.time_hourly}: Actual = {self.actual}"

@receiver(post_save, sender=HourlyOutput)
@receiver(post_delete, sender=HourlyOutput)
def update_total_output(sender, instance, **kwargs):
    prod_sheet = instance.production_sheet
    total = prod_sheet.hourly_outputs.aggregate(total=Sum('actual'))['total'] or 0
    if prod_sheet.total_output != total:
        prod_sheet.total_output = total
        prod_sheet.save(update_fields=['total_output'])
    
class PerformanceMetric(models.Model):
    user = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='performance_metrics')
    monitoring = models.ForeignKey(Monitoring, on_delete=models.CASCADE, related_name='performance_metrics')
    efficiency_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Percentage")
    quality_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Percentage")
    units_per_hour = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    calculated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Performance of {self.user.name} in {self.monitoring.title}"

    class Meta:
        unique_together = ['user', 'monitoring']