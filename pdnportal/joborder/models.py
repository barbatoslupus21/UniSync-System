from django.db import models
from portalusers.models import Users, UserApprovers
from settings.models import Line

class GreenControlNumber(models.Model):
    prepared_by = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name='greenJoPreparer')

    def __str__(self):
        return f'{self.prepared_by}'

class YellowControlNumber(models.Model):
    prepared_by = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name='yellowJoPreparer')

    def __str__(self):
        return f'{self.prepared_by}'

class WhiteControlNumber(models.Model):
    prepared_by = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name='whiteJoPreparer')

    def __str__(self):
        return f'{self.prepared_by}'

class OrangeControlNumber(models.Model):
    prepared_by = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name='orangeJoPreparer')

    def __str__(self):
        return f'{self.prepared_by}'

class JOLogsheet(models.Model):
    STATUS_CHOICES = [
        ('Routing', 'Routing'),
        ('Completed', 'Completed'),
        ('Checked', 'Checked'),
        ('Cancelled', 'Cancelled'),
        ('Closed', 'Closed'),
        ('Rejected', 'Rejected')
    ]
    jo_number = models.CharField(max_length=50, null=True)
    prepared_by = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name='JoRequestPreparer')
    requestor = models.CharField(max_length=100, null=True)
    jo_type = models.CharField(max_length=100, null=True)
    jo_tools = models.CharField(max_length=100, null=True)
    jo_color = models.CharField(max_length=100, null=True)
    line = models.ForeignKey(Line, on_delete=models.SET_NULL, null=True, related_name='joLine')
    details = models.TextField(null=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES ,default='Routing')
    action_taken = models.TextField(null=True)
    in_charge = models.ForeignKey(Users, on_delete=models.CASCADE, null=True, related_name='JORequestInCharge')
    date_created = models.DateTimeField(auto_now_add=True)
    date_received = models.DateTimeField(null=True)
    target_date = models.DateTimeField(null=True, blank=True)
    target_date_reason = models.TextField(null=True, blank=True)
    date_complete = models.DateTimeField(null=True)

    def __str__(self):
        return f'{self.prepared_by} - {self.jo_number}'

class JORouting(models.Model):
    jo_number = models.ForeignKey(JOLogsheet,on_delete=models.CASCADE, null=True, related_name='joRouting')
    jo_request = models.ForeignKey(Users, on_delete=models.CASCADE, null=True, related_name='joPreparer')
    approver = models.ForeignKey(Users, on_delete=models.CASCADE, null=True, related_name='joApprover')
    first_approver = models.BooleanField(default=False)
    approver_sequence = models.IntegerField(null=True)
    status = models.CharField(max_length=50, default='Pending')
    remarks = models.TextField(blank=True)
    request_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True)

    def __str__(self):
        return f'{self.jo_number.jo_number} - {self.approver}'
