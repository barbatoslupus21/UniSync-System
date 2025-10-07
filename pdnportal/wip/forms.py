from django import forms
from django.forms import modelformset_factory
from .models import InventorySession, InventoryEntry, ProductLists, Masterlist, Process
from settings.models import Line

class InventorySessionForm(forms.ModelForm):
    class Meta:
        model = InventorySession
        fields = ['line', 'person_responsible']
        widgets = {
            'line': forms.Select(attrs={
                'class': 'WIP-select',
                'required': True
            }),
            'person_responsible': forms.TextInput(attrs={
                'class': 'WIP-input',
                'placeholder': 'Enter name of person responsible',
                'required': True
            })
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['line'].queryset = Line.objects.all()
        self.fields['line'].empty_label = "Select Line"

class ProductSelectionForm(forms.Form):
    products = forms.ModelMultipleChoiceField(
        queryset=ProductLists.objects.all(),
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'WIP-checkbox-input'}),
        required=True
    )

class RawMaterialEntryForm(forms.ModelForm):
    class Meta:
        model = InventoryEntry
        fields = ['count_tag', 'quantity']
        widgets = {
            'count_tag': forms.TextInput(attrs={
                'class': 'WIP-input WIP-count-tag',
                'placeholder': 'Enter count tag',
                'required': True
            }),
            'quantity': forms.NumberInput(attrs={
                'class': 'WIP-input WIP-quantity',
                'placeholder': '0',
                'min': '0',
                'required': True
            })
        }

class FinishedProductEntryForm(forms.ModelForm):
    class Meta:
        model = InventoryEntry
        fields = ['count_tag', 'quantity']
        widgets = {
            'count_tag': forms.TextInput(attrs={
                'class': 'WIP-input WIP-count-tag',
                'placeholder': 'Enter count tag',
                'required': True
            }),
            'quantity': forms.NumberInput(attrs={
                'class': 'WIP-input WIP-quantity',
                'placeholder': '0',
                'min': '0',
                'required': True
            })
        }

class WIPProductForm(forms.Form):
    product = forms.ModelChoiceField(
        queryset=ProductLists.objects.all(),
        widget=forms.Select(attrs={
            'class': 'WIP-select',
            'id': 'wip-product-select'
        }),
        required=True,
        empty_label="Select Product"
    )
    
    process = forms.ModelChoiceField(
        queryset=Process.objects.none(),
        widget=forms.Select(attrs={
            'class': 'WIP-select',
            'id': 'wip-process-select'
        }),
        required=True,
        empty_label="Select Process"
    )
    
    materials = forms.ModelMultipleChoiceField(
        queryset=Masterlist.objects.none(),
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'WIP-checkbox-input'}),
        required=True
    )
    
    count_tag = forms.CharField(
        widget=forms.TextInput(attrs={
            'class': 'WIP-input',
            'placeholder': 'Enter count tag',
            'required': True
        })
    )
    
    quantity = forms.IntegerField(
        widget=forms.NumberInput(attrs={
            'class': 'WIP-input',
            'placeholder': '0',
            'min': '0',
            'required': True
        })
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'product' in self.data:
            try:
                product_id = int(self.data.get('product'))
                self.fields['process'].queryset = Process.objects.filter(product_id=product_id, is_active=True)
                product = ProductLists.objects.get(id=product_id)
                self.fields['materials'].queryset = product.material.all()
            except (ValueError, TypeError, ProductLists.DoesNotExist):
                pass

RawMaterialFormSet = modelformset_factory(
    InventoryEntry,
    form=RawMaterialEntryForm,
    extra=0,
    can_delete=True
)

FinishedProductFormSet = modelformset_factory(
    InventoryEntry,
    form=FinishedProductEntryForm,
    extra=0,
    can_delete=True
)