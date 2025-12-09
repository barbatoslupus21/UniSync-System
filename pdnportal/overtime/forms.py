from django import forms
from django.core.exceptions import ValidationError
from portalusers.models import Users
from .models import (
    ShuttleVehicle,
    ShuttleProvider,
    Destination,
    DestinationGroup,
    UserShuttleAssignment,
    SubordinateGroup,
    OvertimeFiling,
    OvertimePasscode,
    Holiday
)


class ShuttleVehicleForm(forms.ModelForm):
    class Meta:
        model = ShuttleVehicle
        fields = ['name', 'capacity', 'is_active']

    def clean_name(self):
        name = self.cleaned_data.get('name')
        # Only check against active vehicles
        qs = ShuttleVehicle.objects.filter(name__iexact=name, is_active=True)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError("A shuttle vehicle with this name already exists.")
        return name

    def clean_capacity(self):
        capacity = self.cleaned_data.get('capacity')
        if capacity and capacity < 1:
            raise ValidationError("Capacity must be at least 1.")
        return capacity


class ShuttleProviderForm(forms.ModelForm):
    class Meta:
        model = ShuttleProvider
        fields = ['name', 'contact_person', 'contact_number', 'is_active']

    def clean_name(self):
        name = self.cleaned_data.get('name')
        qs = ShuttleProvider.objects.filter(name__iexact=name, is_active=True)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError("A shuttle provider with this name already exists.")
        return name


class DestinationForm(forms.ModelForm):
    """Form for individual destinations"""
    class Meta:
        model = Destination
        fields = ['name', 'is_active']

    def clean_name(self):
        name = self.cleaned_data.get('name')
        qs = Destination.objects.filter(name__iexact=name, is_active=True)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError("A destination with this name already exists.")
        return name


class DestinationGroupForm(forms.ModelForm):
    """Form for destination groups (provider + vehicle + multiple destinations)"""
    destination_ids = forms.CharField(required=False, widget=forms.HiddenInput())
    
    class Meta:
        model = DestinationGroup
        fields = ['name', 'shuttle_provider', 'shuttle_vehicle', 'is_active']

    def clean_name(self):
        name = self.cleaned_data.get('name')
        # Only check against active destination groups
        qs = DestinationGroup.objects.filter(name__iexact=name, is_active=True)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError("A destination group with this name already exists.")
        return name


class SubordinateGroupForm(forms.ModelForm):
    class Meta:
        model = SubordinateGroup
        fields = ['name', 'employee_ids']

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

    def clean_name(self):
        name = self.cleaned_data.get('name')
        if self.user:
            if SubordinateGroup.objects.filter(
                name__iexact=name,
                created_by=self.user
            ).exclude(pk=self.instance.pk if self.instance.pk else None).exists():
                raise ValidationError("You already have a group with this name.")
        return name

    def clean_employee_ids(self):
        employee_ids = self.cleaned_data.get('employee_ids')
        if not employee_ids or len(employee_ids) == 0:
            raise ValidationError("At least one employee must be selected.")
        return employee_ids

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.user and not instance.pk:
            instance.created_by = self.user
        # Ensure is_active is True for new groups
        if not instance.pk:
            instance.is_active = True
        if commit:
            instance.save()
        return instance


class OvertimeFilingForm(forms.ModelForm):
    class Meta:
        model = OvertimeFiling
        fields = [
            'filing_type', 'employee_id', 'employee_name', 'department',
            'line_name', 'shift', 'time_in', 'time_out', 'date_from',
            'date_to', 'status'
        ]

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        self.is_late_filing = kwargs.pop('is_late_filing', False)
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super().clean()
        filing_type = cleaned_data.get('filing_type')
        date_from = cleaned_data.get('date_from')
        date_to = cleaned_data.get('date_to')
        time_in = cleaned_data.get('time_in')
        time_out = cleaned_data.get('time_out')

        if filing_type == 'shifting' and not date_to:
            raise ValidationError("Date range is required for shifting filings.")

        if date_from and date_to and date_to < date_from:
            raise ValidationError("End date must be after or equal to start date.")

        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.user:
            instance.filed_by = self.user
        instance.is_late_filing = self.is_late_filing
        if commit:
            instance.save()
        return instance


class OvertimePasscodeForm(forms.ModelForm):
    confirm_passcode = forms.CharField(max_length=50, required=True)

    class Meta:
        model = OvertimePasscode
        fields = ['passcode', 'is_active']

    def clean(self):
        cleaned_data = super().clean()
        passcode = cleaned_data.get('passcode')
        confirm = cleaned_data.get('confirm_passcode')

        if passcode and confirm and passcode != confirm:
            raise ValidationError("Passcodes do not match.")

        if passcode and len(passcode) < 4:
            raise ValidationError("Passcode must be at least 4 characters.")

        return cleaned_data


class HolidayForm(forms.ModelForm):
    class Meta:
        model = Holiday
        fields = ['name', 'date', 'is_active']

    def clean_date(self):
        date = self.cleaned_data.get('date')
        if Holiday.objects.filter(date=date).exclude(pk=self.instance.pk if self.instance.pk else None).exists():
            raise ValidationError("A holiday with this date already exists.")
        return date


class UserShuttleAssignmentForm(forms.Form):
    employee_id = forms.IntegerField(required=True)
    destination_group_id = forms.IntegerField(required=False)

    def clean_destination_group_id(self):
        destination_group_id = self.cleaned_data.get('destination_group_id')
        if destination_group_id:
            try:
                DestinationGroup.objects.get(pk=destination_group_id, is_active=True)
            except DestinationGroup.DoesNotExist:
                raise ValidationError("Destination group does not exist or is inactive.")
        return destination_group_id


class BulkOvertimeFilingForm(forms.Form):
    filing_type = forms.ChoiceField(choices=OvertimeFiling.FILING_TYPE_CHOICES)
    employee_data = forms.JSONField()
    shift = forms.ChoiceField(choices=OvertimeFiling.SHIFT_CHOICES)
    time_in = forms.TimeField()
    time_out = forms.TimeField()
    date_from = forms.DateField()
    date_to = forms.DateField(required=False)
    passcode = forms.CharField(required=False, max_length=50)

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        self.is_late_filing = kwargs.pop('is_late_filing', False)
        super().__init__(*args, **kwargs)

    def clean_passcode(self):
        passcode = self.cleaned_data.get('passcode')
        if self.is_late_filing:
            if not passcode:
                raise ValidationError("Passcode is required for late filing.")
            try:
                stored_passcode = OvertimePasscode.objects.filter(is_active=True).first()
                if not stored_passcode or passcode != stored_passcode.passcode:
                    raise ValidationError("Invalid passcode.")
            except OvertimePasscode.DoesNotExist:
                raise ValidationError("Late filing system is not configured.")
        return passcode

    def clean_employee_data(self):
        employee_data = self.cleaned_data.get('employee_data')
        if not employee_data or len(employee_data) == 0:
            raise ValidationError("At least one employee must be selected.")
        return employee_data

    def clean(self):
        cleaned_data = super().clean()
        filing_type = cleaned_data.get('filing_type')
        date_from = cleaned_data.get('date_from')
        date_to = cleaned_data.get('date_to')

        if filing_type == 'shifting' and not date_to:
            raise ValidationError("Date range is required for shifting filings.")

        if date_from and date_to and date_to < date_from:
            raise ValidationError("End date must be after or equal to start date.")

        return cleaned_data


class ExportOvertimeForm(forms.Form):
    EXPORT_TYPE_CHOICES = [
        ('shifting', 'Shifting'),
        ('daily', 'Daily'),
        ('sunday', 'Sunday'),
        ('saturday_off', 'Saturday Off'),
        ('holiday', 'Holiday'),
    ]

    export_type = forms.ChoiceField(choices=EXPORT_TYPE_CHOICES)
    date = forms.DateField(required=False)
    week_number = forms.IntegerField(required=False)
    year = forms.IntegerField(required=False)

    def clean(self):
        cleaned_data = super().clean()
        export_type = cleaned_data.get('export_type')
        date = cleaned_data.get('date')
        week_number = cleaned_data.get('week_number')
        year = cleaned_data.get('year')

        if export_type == 'shifting':
            if not week_number or not year:
                raise ValidationError("Week number and year are required for shifting export.")
        else:
            if not date:
                raise ValidationError("Date is required for this export type.")

        return cleaned_data
