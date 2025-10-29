from django import forms
from django.db.models import Q
from django.core.exceptions import ValidationError
from settings.models import Line
from .models import Monitoring, Product, ProductionSchedulePlan, ProductionOutput, LineToMonitor, SupervisorToMonitor
from portalusers.models import Users

class MonitoringGroupForm(forms.ModelForm):
    lines = forms.ModelMultipleChoiceField(
        queryset=Line.objects.none(),
        required=True,
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'form-check-input'}),
        label='Production Lines',
        help_text='Select one or more production lines to monitor'
    )
    
    supervisors = forms.ModelMultipleChoiceField(
        queryset=Users.objects.filter(
            monitoring_user=True
        ).filter(
            Q(monitoring_supervisor=True) | Q(monitoring_manager=True)
        ),
        required=False,
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'form-check-input'}),
        label='Supervisors/Managers',
        help_text='Select supervisors or managers who can view this monitoring group'
    )
    
    class Meta:
        model = Monitoring
        fields = ['title', 'description']  # Removed 'status'
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter monitoring group title',
                'maxlength': 100
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Enter description (optional)'
            })
            # Removed 'status' widget
        }

    def clean_title(self):
        title = self.cleaned_data.get('title')
        if title:
            title = title.strip()
            if len(title) < 3:
                raise ValidationError('Title must be at least 3 characters long.')
        return title

    def clean_lines(self):
        lines = self.cleaned_data.get('lines')
        if not lines:
            raise ValidationError('Please select at least one production line.')
        return lines
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            # For edit, exclude lines assigned to other groups (not this one)
            assigned_line_ids = LineToMonitor.objects.exclude(monitoring=self.instance).values_list('line_id', flat=True)
            self.fields['lines'].queryset = Line.objects.exclude(id__in=assigned_line_ids)
            self.fields['lines'].initial = LineToMonitor.objects.filter(monitoring=self.instance).values_list('line_id', flat=True)
            self.fields['supervisors'].initial = SupervisorToMonitor.objects.filter(monitoring=self.instance).values_list('supervisor_id', flat=True)
        else:
            # For create, exclude all assigned lines
            assigned_line_ids = LineToMonitor.objects.values_list('line_id', flat=True)
            self.fields['lines'].queryset = Line.objects.exclude(id__in=assigned_line_ids)

    def save(self, commit=True, created_by=None):
        monitoring = super().save(commit=False)
        if created_by:
            monitoring.created_by = created_by
        
        if commit:
            monitoring.save()
            
            lines = self.cleaned_data.get('lines', [])
            supervisors = self.cleaned_data.get('supervisors', [])
            
            LineToMonitor.objects.filter(monitoring=monitoring).delete()
            for line in lines:
                LineToMonitor.objects.get_or_create(monitoring=monitoring, line=line)

            SupervisorToMonitor.objects.filter(monitoring=monitoring).delete()
            for supervisor in supervisors:
                SupervisorToMonitor.objects.get_or_create(monitoring=monitoring, supervisor=supervisor)
        
        return monitoring

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['product_name', 'description', 'line', 'qty_per_box', 'qty_per_hour']
        widgets = {
            'product_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter product name',
                'maxlength': 100
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Enter product description',
                'rows': 3
            }),
            'line': forms.Select(attrs={'class': 'form-control'}),
            'qty_per_box': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'Quantity per box',
                'min': 1
            }),
            'qty_per_hour': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'Quantity per hour',
                'min': 1
            }),
        }

    def __init__(self, *args, **kwargs):
        monitoring = kwargs.pop('monitoring', None)
        super().__init__(*args, **kwargs)
        
        if monitoring:
            self.fields['line'].queryset = Line.objects.filter(
                assigned_lines__monitoring=monitoring
            )
        
        self.fields['description'].required = True

    def clean_product_name(self):
        product_name = self.cleaned_data.get('product_name')
        if product_name:
            product_name = product_name.strip()
            if len(product_name) < 2:
                raise ValidationError('Product name must be at least 2 characters long.')
        return product_name

    def clean_qty_per_box(self):
        qty = self.cleaned_data.get('qty_per_box')
        if qty is not None and qty <= 0:
            raise ValidationError('Quantity per box must be greater than 0.')
        return qty

    def clean_qty_per_hour(self):
        qty = self.cleaned_data.get('qty_per_hour')
        if qty is not None and qty <= 0:
            raise ValidationError('Quantity per hour must be greater than 0.')
        return qty

class ScheduleForm(forms.ModelForm):
    class Meta:
        model = ProductionSchedulePlan
        fields = ['product_number', 'date_planned', 'shift', 'planned_qty', 'status']
        widgets = {
            'product_number': forms.Select(attrs={'class': 'form-control'}),
            'date_planned': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date'
            }),
            'shift': forms.Select(attrs={'class': 'form-control'}),
            'planned_qty': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'Planned quantity',
                'min': 1
            }),
            'status': forms.Select(attrs={'class': 'form-control'})
        }

    def __init__(self, *args, **kwargs):
        monitoring = kwargs.pop('monitoring', None)
        super().__init__(*args, **kwargs)
        
        if monitoring:
            self.fields['product_number'].queryset = Product.objects.filter(
                monitoring=monitoring
            )

    def clean_planned_qty(self):
        qty = self.cleaned_data.get('planned_qty')
        if qty is not None and qty <= 0:
            raise ValidationError('Planned quantity must be greater than 0.')
        return qty
    
    def save(self, commit=True, monitoring=None):
        schedule = super().save(commit=False)
        
        if monitoring:
            schedule.monitoring = monitoring
        
        if commit:
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
        operator = self.cleaned_data['operator']
        return ' '.join(word.capitalize() for word in operator.split())

    def clean_quantity(self):
        quantity = self.cleaned_data.get('quantity')
        if quantity is not None and quantity <= 0:
            raise forms.ValidationError('Quantity must be greater than 0.')
        return quantity

class FilterForm(forms.Form):
    TIME_RANGE_CHOICES = [
        ('today', 'Today'),
        ('week', 'This Week'),
        ('month', 'This Month'),
        ('year', 'This Year'),
    ]
    
    SHIFT_CHOICES = [
        ('all', 'All Shifts'),
        ('AM', 'AM Shift'),
        ('PM', 'PM Shift'),
    ]
    
    time_range = forms.ChoiceField(
        choices=TIME_RANGE_CHOICES,
        initial='today',
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    monitoring_group = forms.ModelChoiceField(
        queryset=Monitoring.objects.none(),
        required=False,
        empty_label='All Groups',
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    line = forms.ModelChoiceField(
        queryset=Line.objects.none(),
        required=False,
        empty_label='All Lines',
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    shift = forms.ChoiceField(
        choices=SHIFT_CHOICES,
        initial='all',
        widget=forms.Select(attrs={'class': 'form-control'})
    )

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        monitoring = kwargs.pop('monitoring', None)
        super().__init__(*args, **kwargs)
        
        if user:
            if user.monitoring_sales:
                self.fields['monitoring_group'].queryset = Monitoring.objects.all()
            else:
                assigned_monitoring_ids = SupervisorToMonitor.objects.filter(
                    supervisor=user
                ).values_list('monitoring_id', flat=True)
                
                self.fields['monitoring_group'].queryset = Monitoring.objects.filter(
                    Q(id__in=assigned_monitoring_ids) | Q(created_by=user)
                )
        
        if monitoring:
            self.fields['line'].queryset = Line.objects.filter(
                assigned_lines__monitoring=monitoring
            )

class ExportForm(forms.Form):
    from_date = forms.DateField(
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        })
    )
    
    to_date = forms.DateField(
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        })
    )
    
    line = forms.ModelChoiceField(
        queryset=Line.objects.none(),
        required=False,
        empty_label='All Lines',
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    shift = forms.ChoiceField(
        choices=[
            ('all', 'All Shifts'),
            ('AM', 'AM Shift'),
            ('PM', 'PM Shift'),
        ],
        initial='all',
        widget=forms.Select(attrs={'class': 'form-control'})
    )

    def __init__(self, *args, **kwargs):
        monitoring = kwargs.pop('monitoring', None)
        super().__init__(*args, **kwargs)
        
        if monitoring:
            self.fields['line'].queryset = Line.objects.filter(
                assigned_lines__monitoring=monitoring
            )

    def clean(self):
        cleaned_data = super().clean()
        from_date = cleaned_data.get('from_date')
        to_date = cleaned_data.get('to_date')
        
        if from_date and to_date:
            if from_date > to_date:
                raise ValidationError('From date must be before or equal to To date.')
        
        return cleaned_data