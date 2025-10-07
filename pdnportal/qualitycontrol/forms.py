from django import forms
from .models import TrialRunRequest, LotOutInspection, CutAway
from settings.models import Line

class TrialRunRequestForm(forms.ModelForm):
    class Meta:
        model = TrialRunRequest
        fields = ['trial_date', 'product_name', 'product_number', 'line', 'process_name', 'trial_operator', 'change_from', 'change_to']
        widgets = {
            'trial_date': forms.DateInput(attrs={'type': 'date', 'class': 'JO-input'}),
            'product_name': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter product name'}),
            'product_number': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter product number'}),
            'line': forms.Select(attrs={'class': 'JO-select'}),
            'process_name': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter process name'}),
            'trial_operator': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter trial operator'}),
            'change_from': forms.Textarea(attrs={'class': 'JO-textarea', 'placeholder': 'Describe what is being changed from', 'rows': 3}),
            'change_to': forms.Textarea(attrs={'class': 'JO-textarea', 'placeholder': 'Describe what is being changed to', 'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make all fields required
        for field in self.fields:
            self.fields[field].required = True


class LotOutInspectionForm(forms.ModelForm):
    class Meta:
        model = LotOutInspection
        fields = ['line_affected', 'product_number', 'product_name', 'reason_for_lot_out']
        widgets = {
            'line_affected': forms.Select(attrs={'class': 'JO-select'}),
            'product_number': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter product number'}),
            'product_name': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter product name'}),
            'reason_for_lot_out': forms.Textarea(attrs={'class': 'JO-textarea', 'placeholder': 'Describe the reason for lot out inspection', 'rows': 4}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make all fields required
        for field in self.fields:
            self.fields[field].required = True


class CutAwayForm(forms.ModelForm):
    class Meta:
        model = CutAway
        fields = ['assy_line', 'machine_number', 'applicator_number_code', 
                  'crimped_quantity', 'product_number', 'terminal_part_number']
        widgets = {
            'assy_line': forms.Select(attrs={'class': 'JO-select'}),
            'machine_number': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter machine number'}),
            'applicator_number_code': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter applicator number/code'}),
            'crimped_quantity': forms.NumberInput(attrs={'class': 'JO-input', 'placeholder': 'Enter quantity', 'min': 1}),
            'product_number': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter product number'}),
            'terminal_part_number': forms.TextInput(attrs={'class': 'JO-input', 'placeholder': 'Enter terminal part number'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make all fields required
        for field in self.fields:
            self.fields[field].required = True
