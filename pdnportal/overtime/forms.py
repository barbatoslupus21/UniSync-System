# overtime/forms.py
from django import forms
from django.core.exceptions import ValidationError
from portalusers.models import Users
from .models import Employee, EmployeeGroup, OTFiling, ShiftingOT, DailyOT, EmployeeOTStatus, LateFilingPassword

class EmployeeForm(forms.ModelForm):
    class Meta:
        model = Employee
        fields = ['id_number', 'name', 'department', 'line']

    def clean_id_number(self):
        id_number = self.cleaned_data.get('id_number')

        if Employee.objects.filter(id_number=id_number).exclude(pk=self.instance.pk if self.instance.pk else None).exists():
            raise ValidationError("An employee with this ID number already exists.")

        return id_number

    def clean_name(self):
        name = self.cleaned_data.get('name')
        return name.title() if name else name

class EmployeeGroupForm(forms.ModelForm):
    class Meta:
        model = EmployeeGroup
        fields = ['name', 'employees']

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        self.fields['employees'].queryset = Employee.objects.filter(is_active=True)
        self.fields['employees'].widget = forms.CheckboxSelectMultiple()

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.user and not instance.pk:
            instance.created_by = self.user

        if commit:
            instance.save()
            self.save_m2m()

        return instance

class ShuttleAssignmentForm(forms.Form):
    employee_id = forms.IntegerField(required=True)
    shuttle_service = forms.CharField(required=False)

    def clean_employee_id(self):
        employee_id = self.cleaned_data.get('employee_id')

        try:
            employee = Employee.objects.get(pk=employee_id)
        except Employee.DoesNotExist:
            raise ValidationError("Employee does not exist.")

        return employee_id

class ShiftingOTForm(forms.Form):
    group_id = forms.IntegerField(required=True)
    start_date = forms.DateField(required=True)
    end_date = forms.DateField(required=True)
    shift_type = forms.ChoiceField(choices=[('AM', 'AM Shift'), ('PM', 'PM Shift')], required=True)
    employee_statuses = forms.Field(required=True)  # Changed from JSONField to Field to accept both string and list
    late_filing_password = forms.CharField(required=False)

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        self.late_filing = kwargs.pop('late_filing', False)
        super().__init__(*args, **kwargs)

    def clean_group_id(self):
        group_id = self.cleaned_data.get('group_id')

        try:
            group = EmployeeGroup.objects.get(pk=group_id)

            if self.user and group.created_by != self.user:
                raise ValidationError("You don't have permission to use this group.")

        except EmployeeGroup.DoesNotExist:
            raise ValidationError("Employee group does not exist.")

        return group_id

    def clean_end_date(self):
        start_date = self.cleaned_data.get('start_date')
        end_date = self.cleaned_data.get('end_date')

        if start_date and end_date and end_date < start_date:
            raise ValidationError("End date must be after start date.")

        return end_date

    def clean_late_filing_password(self):
        password = self.cleaned_data.get('late_filing_password')

        if self.late_filing:
            if not password:
                raise ValidationError("Password is required for late filing.")

            try:
                stored_password = LateFilingPassword.objects.get(password_type='SHIFTING')
                if password != stored_password.password:
                    raise ValidationError("Invalid password for late filing.")
            except LateFilingPassword.DoesNotExist:
                raise ValidationError("Late filing system is not properly configured.")

        return password

class DailyOTForm(forms.Form):
    group_id = forms.IntegerField(required=True)
    date = forms.DateField(required=True)
    schedule_type = forms.ChoiceField(choices=DailyOT.SCHEDULE_CHOICES, required=True)
    start_time = forms.TimeField(required=True)
    end_time = forms.TimeField(required=True)
    reason = forms.CharField(required=True)
    employee_statuses = forms.Field(required=True)  # Changed from JSONField to Field to accept both string and list
    late_filing_password = forms.CharField(required=False)

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        self.late_filing = kwargs.pop('late_filing', False)
        super().__init__(*args, **kwargs)

    def clean_group_id(self):
        group_id = self.cleaned_data.get('group_id')

        try:
            group = EmployeeGroup.objects.get(pk=group_id)

            # Ensure group belongs to user
            if self.user and group.created_by != self.user:
                raise ValidationError("You don't have permission to use this group.")

        except EmployeeGroup.DoesNotExist:
            raise ValidationError("Employee group does not exist.")

        return group_id

    def clean(self):
        cleaned_data = super().clean()
        start_time = cleaned_data.get('start_time')
        end_time = cleaned_data.get('end_time')

        if start_time and end_time and start_time >= end_time:
            self.add_error('end_time', "End time must be after start time.")

        return cleaned_data

    def clean_late_filing_password(self):
        password = self.cleaned_data.get('late_filing_password')
        schedule_type = self.cleaned_data.get('schedule_type')

        if self.late_filing:
            if not password:
                raise ValidationError("Password is required for late filing.")

            password_type = 'DAILY'
            if schedule_type in ['SUNDAY', 'SATURDAY', 'HOLIDAY']:
                password_type = 'WEEKEND'

            try:
                stored_password = LateFilingPassword.objects.get(password_type=password_type)
                if password != stored_password.password:
                    raise ValidationError("Invalid password for late filing.")
            except LateFilingPassword.DoesNotExist:
                raise ValidationError("Late filing system is not properly configured.")

        return password

class LateFilingPasswordForm(forms.ModelForm):
    confirm_password = forms.CharField(max_length=50, required=True)

    class Meta:
        model = LateFilingPassword
        fields = ['password_type', 'password']

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm = cleaned_data.get('confirm_password')

        if password and confirm and password != confirm:
            self.add_error('confirm_password', "Passwords do not match.")

        if password and (len(password) < 6 or
                         not any(char.isalpha() for char in password) or
                         not any(char.isdigit() for char in password)):
            self.add_error('password', "Password must be at least 6 characters and contain at least one letter and one number.")

        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.user:
            instance.updated_by = self.user

        if commit:
            instance.save()

        return instance

class ExcelImportForm(forms.Form):
    file = forms.FileField(required=True)

    def clean_file(self):
        file = self.cleaned_data.get('file')

        if file:
            valid_extensions = ['.xlsx', '.xls']
            import os
            ext = os.path.splitext(file.name)[1]
            if ext.lower() not in valid_extensions:
                raise ValidationError("Invalid file format. Please upload an Excel file (.xlsx or .xls).")

        return file