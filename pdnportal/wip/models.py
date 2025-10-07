from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.conf import settings
from portalusers.models import Users
from settings.models import Line

class Masterlist(models.Model):
    material_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    uom = models.CharField(max_length=100, null=True, blank=True, verbose_name="Unit of Measure")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.material_name} - {self.description}"

    def clean(self):
        if self.material_name:
            self.material_name = self.material_name.strip()

    class Meta:
        ordering = ['material_name']
        verbose_name = "Master List Item"
        verbose_name_plural = "Master List"
        indexes = [
            models.Index(fields=['material_name']),
            models.Index(fields=['is_active']),
        ]

class ProductLists(models.Model):
    product_number = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product_number} - {self.description}"

    def clean(self):
        if self.product_number:
            self.product_number = self.product_number.strip().upper()

    class Meta:
        ordering = ['product_number']
        verbose_name = 'Product List'
        verbose_name_plural = 'Product Lists'
        indexes = [
            models.Index(fields=['product_number']),
            models.Index(fields=['is_active']),
        ]

class WipMasterlist(models.Model):
    product_number = models.ForeignKey(
        ProductLists, 
        on_delete=models.CASCADE, 
        related_name="wip_items"
    )
    material_name = models.ForeignKey(
        Masterlist, 
        on_delete=models.CASCADE, 
        related_name="wip_usage"
    )
    cutting_length = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)]
    )
    uom = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product_number.product_number} - {self.material_name.material_name}"

    def clean(self):
        if self.cutting_length and self.cutting_length <= 0:
            raise ValidationError("Cutting length must be greater than 0")

    class Meta:
        ordering = ['product_number__product_number', 'material_name__material_name']
        verbose_name = "WIP Master List Item"
        verbose_name_plural = "WIP Master List"
        # unique_together = ['product_number', 'material_name']
        indexes = [
            models.Index(fields=['product_number', 'material_name']),
            models.Index(fields=['is_active']),
        ]

class Process(models.Model):
    process_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.process_name

    def clean(self):
        if self.process_name:
            self.process_name = self.process_name.strip()

    class Meta:
        ordering = ['process_name']
        verbose_name_plural = "Processes"
        indexes = [
            models.Index(fields=['process_name']),
            models.Index(fields=['is_active']),
        ]

class InventorySession(models.Model):
    STATUS_CHOICES = [
        ('FOR_CHECKING', 'For Checking'),
        ('CHECKED', 'Checked'),
        ('LOCKED', 'Locked'),
    ]
    
    line = models.ForeignKey(Line, on_delete=models.CASCADE, related_name='wip2_inventory_sessions')
    person_responsible = models.CharField(max_length=200)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='FOR_CHECKING')
    created_by = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='wip2_created_sessions')
    checked_by = models.ForeignKey(
        Users, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='wip2_checked_sessions'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    checked_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.line.line_name} - {self.person_responsible} ({self.get_status_display()})"

    @property
    def entry_count(self):
        return self.entries.count()

    @property
    def checked_entry_count(self):
        return self.entries.filter(status='CHECKED').count()

    @property
    def pending_entry_count(self):
        return self.entries.filter(status='FOR_CHECKING').count()

    @property
    def completion_percentage(self):
        total = self.entry_count
        if total == 0:
            return 0
        return round((self.checked_entry_count / total) * 100, 2)

    @property
    def can_edit(self):
        return self.status == 'FOR_CHECKING'

    @property
    def can_check(self):
        return self.status == 'FOR_CHECKING'

    @property
    def can_lock(self):
        return self.status == 'CHECKED' and not self.entries.filter(status='FOR_CHECKING').exists()

    def lock_session(self, user):
        if self.entries.filter(status='FOR_CHECKING').exists():
            raise ValueError("Cannot lock session with unchecked entries")
        
        self.status = 'LOCKED'
        self.checked_by = user
        self.locked_at = timezone.now()
        self.save()

    def mark_as_checked(self, user):
        if self.entries.filter(status='FOR_CHECKING').exists():
            raise ValueError("Cannot mark session as checked with pending entries")
            
        self.status = 'CHECKED'
        self.checked_by = user
        self.checked_at = timezone.now()
        self.save()

    def clean(self):
        if self.person_responsible:
            self.person_responsible = self.person_responsible.strip()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['line', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
        ]

class InventoryEntry(models.Model):
    INVENTORY_TYPE_CHOICES = [
        ('RAW', 'Raw Materials'),
        ('FINISHED', 'Finished Product'),
        ('WIP', 'WIP Product'),
    ]

    STATUS_CHOICES = [
        ('FOR_CHECKING', 'For Checking'),
        ('CHECKED', 'Checked'),
    ]

    session = models.ForeignKey(
        InventorySession, 
        on_delete=models.CASCADE, 
        related_name='entries'
    )
    inventory_type = models.CharField(
        max_length=15, 
        choices=INVENTORY_TYPE_CHOICES, 
        default='RAW'
    )
    product = models.ForeignKey(
        ProductLists, 
        on_delete=models.CASCADE, 
        related_name='inventory_entries'
    )
    material = models.ForeignKey(
        Masterlist, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='inventory_entries'
    )
    process = models.ForeignKey(
        Process, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='inventory_entries'
    )
    count_tag = models.CharField(max_length=100)
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    unit_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)]
    )
    status = models.CharField(
        max_length=15, 
        choices=STATUS_CHOICES, 
        default='FOR_CHECKING'
    )
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    checked_by = models.ForeignKey(
        Users, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='wip2_checked_entries'
    )
    checked_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        material_display = self.material.material_name if self.material else 'N/A'
        return f"{self.session.line.line_name} | {self.get_inventory_type_display()} | {self.product.product_number} | {material_display} | Tag: {self.count_tag}"

    @property
    def total_value(self):
        if self.unit_cost:
            return self.quantity * self.unit_cost
        return None

    def mark_as_checked(self, user):
        self.status = 'CHECKED'
        self.checked_by = user
        self.checked_at = timezone.now()
        self.save()

    def clean(self):
        super().clean()
        
        if self.count_tag:
            self.count_tag = self.count_tag.strip().upper()
            
        # Validate inventory type specific requirements
        if self.inventory_type == 'RAW' and not self.material:
            raise ValidationError("Material is required for raw material entries")
            
        if self.inventory_type == 'WIP' and not self.process:
            raise ValidationError("Process is required for WIP entries")
            
        if self.session and self.session.status == 'LOCKED':
            raise ValidationError("Cannot modify entries in a locked session")

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session', 'inventory_type']),
            models.Index(fields=['count_tag']),
            models.Index(fields=['status']),
            models.Index(fields=['product', 'material']),
        ]