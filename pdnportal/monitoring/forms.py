from django import forms
from django.db.models import Q
from settings.models import Line
from .models import Monitoring, Product, ProductionSchedulePlan, ProductionOutput, LineToMonitor, SupervisorToMonitor
from portalusers.models import Users

class MonitoringGroupForm(forms.ModelForm):
    lines = forms.ModelMultipleChoiceField(
        queryset=Line.objects.all(),
        required=True,
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'hidden-lines-select'}),
        label='Production Lines'
    )
    
    supervisors = forms.ModelMultipleChoiceField(
        queryset=Users.objects.filter(monitoring_user=True).filter(
            Q(monitoring_supervisor=True) | Q(monitoring_manager=True)
        ),
        required=False,
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'supervisor-checkbox'}),
        label='Supervisors'
    )
    
    class Meta:
        model = Monitoring
        fields = ['title', 'status', 'description']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control', 'id': 'id_title'}),
            'status': forms.Select(attrs={'class': 'form-control', 'id': 'id_status'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'id': 'id_description'})
        }
    
    def save(self, commit=True, created_by=None):
        monitoring = super().save(commit=False)
        if created_by:
            monitoring.created_by = created_by
        
        if commit:
            monitoring.save()
            
            if self.cleaned_data.get('lines'):
                LineToMonitor.objects.filter(monitoring=monitoring).delete()

                for line in self.cleaned_data['lines']:
                    LineToMonitor.objects.create(monitoring=monitoring, line=line)

            if self.cleaned_data.get('supervisors'):
                SupervisorToMonitor.objects.filter(monitoring=monitoring).delete()
                for supervisor in self.cleaned_data['supervisors']:
                    SupervisorToMonitor.objects.create(monitoring=monitoring, supervisor=supervisor)
        
        return monitoring

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['product_name', 'line', 'qty_per_box', 'qty_per_hour', 'description']
        widgets = {
            'product_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter product name'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'placeholder': 'Enter product description', 'rows': 3}),
            'line': forms.Select(attrs={'class': 'form-control'}),
            'qty_per_box': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Quantity per box'}),
            'qty_per_hour': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Quantity per hour'}),
        }
    
    def __init__(self, *args, **kwargs):
        super(ProductForm, self).__init__(*args, **kwargs)
        self.fields['description'].required = True

class ScheduleForm(forms.ModelForm):
    class Meta:
        model = ProductionSchedulePlan
        fields = ['product_number', 'date_planned', 'shift', 'planned_qty', 'status']
        widgets = {
            'product_number': forms.Select(attrs={'class': 'form-control', 'id': 'id_product_number'}),
            'date_planned': forms.DateInput(attrs={'class': 'form-control', 'id': 'id_date_planned', 'type': 'date'}),
            'shift': forms.Select(attrs={'class': 'form-control', 'id': 'id_shift'}),
            'planned_qty': forms.NumberInput(attrs={'class': 'form-control', 'id': 'id_planned_qty', 'min': '1'}),
            'status': forms.Select(attrs={'class': 'form-control', 'id': 'id_status'})
        }
    
    def save(self, commit=True, monitoring=None):
        schedule = super().save(commit=False)
        
        if monitoring:
            schedule.monitoring = monitoring
        
        if commit:
            schedule.save()
            
            schedule.balance = schedule.planned_qty
            schedule.save()
        
        return schedule

class OutputForm(forms.Form):
    operator = forms.CharField(
        max_length=100,
        required=True,
        widget=forms.TextInput(
            attrs={
                'class': 'JO-input',
                'id': 'output-operator',
                'placeholder': 'Enter operator name'
            }
        )
    )
    
    quantity = forms.IntegerField(
        min_value=1,
        required=True,
        widget=forms.NumberInput(
            attrs={
                'class': 'JO-input',
                'id': 'output-quantity',
                'min': '1',
                'placeholder': 'Enter quantity'
            }
        )
    )
    
    def clean_operator(self):
        """Format operator name to proper case"""
        operator = self.cleaned_data['operator']
        return ' '.join(word.capitalize() for word in operator.split())