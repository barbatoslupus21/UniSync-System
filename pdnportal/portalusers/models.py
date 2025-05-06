from django.db import models
from django.contrib.auth.models import AbstractUser
from settings.models import Line

class Users(AbstractUser):
    POSITION = [
        ('Staff', 'Staff'),
        ('Clerk', 'Clerk'),
        ('Assistant', 'Assistant'),
        ('Innovator', 'Innovator'),
        ('Supervisor', 'Supervisor'),
        ('Manager', 'Manager')
    ]
    avatar = models.ImageField(upload_to='profile/', null=True, default='images/profile/avatar.png') 
    id_number = models.CharField(max_length=10, null=True)
    name = models.CharField(max_length=100, null=True)
    position = models.CharField(max_length=100, choices=POSITION, null=True)
    line = models.ForeignKey(Line, on_delete=models.CASCADE, null=True, related_name='user_line')
    username = models.CharField(max_length=50, null=True, unique=True)
    is_admin = models.BooleanField(default=False)

    job_order_user = models.BooleanField(default=False)
    job_order_requestor = models.BooleanField(default=False)
    job_order_approver = models.BooleanField(default=False)
    job_order_checker = models.BooleanField(default=False)
    job_order_maintenance = models.BooleanField(default=False)
    job_order_facilitator = models.BooleanField(default=False)
    
    # Manhours Permissions
    manhours_user = models.BooleanField(default=False)
    manhours_staff = models.BooleanField(default=False)
    manhours_supervisor = models.BooleanField(default=False)

    # Monitoring Permission
    monitoring_user = models.BooleanField(default=False)
    monitoring_staff = models.BooleanField(default=False)
    monitoring_supervisor = models.BooleanField(default=False)
    monitoring_manager = models.BooleanField(default=False)
    monitoring_qad = models.BooleanField(default=False)
    monitoring_sales = models.BooleanField(default=False)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

class UserApprovers(models.Model):
    MODULES = [
        ('Job Order', 'Job Order'),
        ('Manhours', 'Manhours'),
        ('Monitoring', 'Monitoring')
    ]

    ROLES = [
        ('Requestor', 'Requestor'),
        ('Checker', 'Checker'),
        ('Approver', 'Approver')
    ]
    user = models.ForeignKey(Users, on_delete=models.CASCADE, null=True, related_name='user_list_approvers')
    module = models.CharField(max_length=200, choices=MODULES, null=True)
    approver_role = models.CharField(max_length=100, choices=ROLES, null=True)
    approver = models.ForeignKey(Users, on_delete=models.CASCADE, null=True, related_name='user_approver')

    def __str__(self):
        return f'{self.user.name} - {self.module}'
    
class joSettings(models.Model):

    USER_TYPES = [
        ('Requestor', 'Requestor'),
        ('Approver', 'Approver'),
        ('Maintenance', 'Maintenance'),
        ('QA Checker', 'QA Checker'),
        ('Facilitator', 'Facilitator'),
    ]

    user = models.ForeignKey(Users, on_delete=models.CASCADE, null=True, related_name='jo_userSettings')
    userrole = models.CharField(max_length=20, choices=USER_TYPES, default='Requestor')

    def __str__(self):
        return f'{self.user.name} - {self.userrole}'
    

class UserLine(models.Model):
    user = models.ForeignKey(Users, on_delete=models.CASCADE, null=True, related_name='line_designation') 
    line = models.ForeignKey(Line, on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.user.name} - {self.line}'