from django.db import models
from portalusers.models import Users
from django.core.validators import MinValueValidator
from settings.models import Line


class StockDeclaration(models.Model):    
    STOCK_TYPE_CHOICES = [
        ('critical', 'Critical Stock'),
        ('out_of_stock', 'Out Of Stock'),
        ('overstock', 'Overstock'),
    ]
    
    STATUS_CHOICES = [
        ('filed', 'Filed'),
        ('in_transit', 'In Transit'),
        ('arrived', 'Arrived'),
        ('cancelled', 'Cancelled'),
    ]

    control_number = models.CharField(max_length=20, unique=True, editable=False, verbose_name="Control Number")
    lines = models.ManyToManyField(Line, related_name='stock_declarations', verbose_name="Production Lines")
    stock_type = models.CharField(max_length=20,choices=STOCK_TYPE_CHOICES,verbose_name="Stock Declaration Type")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='filed', verbose_name="Status")
    product_number = models.CharField(max_length=100,verbose_name="Product Number")
    product_name = models.CharField(max_length=255,verbose_name="Product Name")
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(0)],verbose_name="Quantity")
    in_transit = models.TextField(null=True,blank=True,verbose_name="In Transit Details",help_text="Optional information about items currently in transit")
    received_by_production = models.BooleanField(default=False,verbose_name="Received by Production")
    date_received_by_production = models.DateTimeField(null=True,blank=True,verbose_name="Date Received by Production")
    created_at = models.DateTimeField(auto_now_add=True,verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True,verbose_name="Updated At")
    created_by = models.ForeignKey(Users,on_delete=models.SET_NULL,null=True,related_name='created_stock_declarations',verbose_name="Created By")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Stock Declaration"
        verbose_name_plural = "Stock Declarations"
        indexes = [
            models.Index(fields=['control_number']),
            models.Index(fields=['stock_type']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        lines_str = ", ".join([line.line_name for line in self.lines.all()]) if self.lines.exists() else "No lines"
        return f"{self.control_number} - {self.product_name} ({self.get_stock_type_display()}) - {self.get_status_display()} - Lines: {lines_str}"
    
    def save(self, *args, **kwargs):
        if not self.control_number:
            self.control_number = self.generate_control_number()
        
        # Update received_by_production based on status
        if self.status == 'arrived':
            self.received_by_production = True
            if not self.date_received_by_production:
                from django.utils import timezone
                self.date_received_by_production = timezone.now()
        elif self.status == 'cancelled':
            self.received_by_production = False
        # For 'in_transit', keep the current received_by_production value
        
        super().save(*args, **kwargs)
    
    def generate_control_number(self):
        from datetime import datetime
        current_year = datetime.now().year
        
        last_declaration = StockDeclaration.objects.filter(control_number__startswith=f'SD-{current_year}-').order_by('-control_number').first()
        
        if not last_declaration or not last_declaration.control_number:
            return f'SD-{current_year}-1000'
        
        try:
            last_number = int(last_declaration.control_number.split('-')[2])
            new_number = last_number + 1
            return f'SD-{current_year}-{new_number:04d}'
        except (ValueError, IndexError):
            # Fallback: count existing declarations for this year and add to 999
            year_count = StockDeclaration.objects.filter(control_number__startswith=f'SD-{current_year}-').count()
            return f'SD-{current_year}-{1000 + year_count:04d}'
    
    @property
    def status_color(self):
        colors = {
            'filed': 'orange',
            'in_transit': 'blue',
            'arrived': 'green',
            'cancelled': 'red',
        }
        return colors.get(self.status, 'gray')
    
    @property
    def is_received(self):
        return self.status == 'arrived'


class StockDeclarationView(models.Model):
    
    user = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name='stock_declaration_views',
        verbose_name="User"
    )
    stock_declaration = models.ForeignKey(
        StockDeclaration,
        on_delete=models.CASCADE,
        related_name='user_views',
        verbose_name="Stock Declaration"
    )
    viewed_at = models.DateTimeField(auto_now_add=True, verbose_name="Viewed At")
    
    class Meta:
        unique_together = ['user', 'stock_declaration']
        ordering = ['-viewed_at']
        verbose_name = "Stock Declaration View"
        verbose_name_plural = "Stock Declaration Views"
        indexes = [
            models.Index(fields=['user', 'stock_declaration']),
            models.Index(fields=['-viewed_at']),
        ]
    
    def __str__(self):
        return f"{self.user.name} viewed {self.stock_declaration.control_number} at {self.viewed_at}"