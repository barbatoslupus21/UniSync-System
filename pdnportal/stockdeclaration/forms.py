from django import forms
from django.core.exceptions import ValidationError
from .models import StockDeclaration
from settings.models import Line


class StockDeclarationForm(forms.ModelForm):
    """Form for creating new stock declarations"""

    lines = forms.ModelMultipleChoiceField(
        queryset=Line.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=True,
        help_text="Select the production lines for this stock declaration"
    )

    class Meta:
        model = StockDeclaration
        fields = [
            'product_number',
            'product_name',
            'quantity',
            'stock_type',
            'lines'
        ]
        widgets = {
            'product_number': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter product number'
            }),
            'product_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter product name'
            }),
            'quantity': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '0',
                'placeholder': 'Enter quantity'
            }),
            'stock_type': forms.Select(attrs={
                'class': 'form-control'
            }),
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

        # Add form-control class to lines checkboxes
        self.fields['lines'].widget.attrs.update({'class': 'lines-checkboxes'})

    def clean_quantity(self):
        """Validate quantity is positive"""
        quantity = self.cleaned_data.get('quantity')
        if quantity is not None and quantity < 0:
            raise ValidationError("Quantity cannot be negative.")
        return quantity

    def clean_lines(self):
        """Validate that at least one line is selected"""
        lines = self.cleaned_data.get('lines')
        if not lines:
            raise ValidationError("Please select at least one production line.")
        return lines

    def clean(self):
        """Additional form-wide validation"""
        cleaned_data = super().clean()
        lines = cleaned_data.get('lines')
        
        if not lines:
            raise ValidationError("At least one production line must be selected.")
        
        return cleaned_data

    def save(self, commit=True):
        """Override save to set created_by"""
        instance = super().save(commit=False)
        if self.user:
            instance.created_by = self.user
        if commit:
            instance.save()
            self.save_m2m()  # Save many-to-many relationships
        return instance
