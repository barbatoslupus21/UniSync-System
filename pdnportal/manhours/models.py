from django.db import models
from portalusers.models import Users
from decimal import Decimal

class Machine(models.Model):
    machine_name = models.CharField(max_length=500, null=True)
    location = models.CharField(max_length=100, null=True)
    date_created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.machine_name
    
class Operators(models.Model):
    operator_name = models.CharField(max_length=500, null=True)
    def __str__(self):
        return self.operator_name
    
class ManhoursLogsheet(models.Model):
    SHIFTS = {
        'AM':'AM',
        'PM':'PM'
    }
    user = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name="user_manhours")
    operator = models.CharField(max_length=500, null=True)
    shift = models.CharField(max_length=2, choices=SHIFTS, default='AM')
    line = models.CharField(max_length=50, null=True)
    machine = models.ForeignKey(Machine, on_delete=models.SET_NULL, null=True, related_name="machine_logsheet")
    setup = models.IntegerField(default=0)
    manhours = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    output = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_output = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, editable=False)
    date_completed = models.DateTimeField(null=True)
    date_submitted = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.manhours > 0:
            self.total_output = self.output / self.manhours
        else:
            self.total_output = Decimal(0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user.name}-{self.operator}'