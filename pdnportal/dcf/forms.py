from django import forms
from .models import DCF, DCFApprovalTimeline
from django.utils import timezone

class DCFForm(forms.ModelForm):
    prepared_by = forms.CharField(
        max_length=50,
        required=False,
        widget=forms.TextInput(attrs={'class': 'DCF-input'})
    )

    class Meta:
        model = DCF
        fields = [
            'prepared_by',
            'document_code',
            'document_title',
            'revision_number',
            'nature',
            'details',
            'effectivity_date'
        ]
        widgets = {
            'document_code': forms.TextInput(attrs={'class': 'DCF-input', 'placeholder': 'Enter document code'}),
            'document_title': forms.TextInput(attrs={'class': 'DCF-input', 'placeholder': 'Enter document title'}),
            'revision_number': forms.TextInput(attrs={'class': 'DCF-input', 'placeholder': 'Enter revision number'}),
            'nature': forms.Select(attrs={'class': 'DCF-select'}),
            'details': forms.Textarea(attrs={'class': 'DCF-textarea', 'rows': 4, 'placeholder': 'Provide detailed description of the changes required...'}),
            'effectivity_date': forms.DateInput(attrs={'class': 'DCF-input', 'type': 'date'}),
        }

    def clean_effectivity_date(self):
        effectivity_date = self.cleaned_data.get('effectivity_date')
        if effectivity_date and effectivity_date < timezone.now().date():
            raise forms.ValidationError("Effectivity date must be in the future")
        return effectivity_date


class DCFApprovalForm(forms.ModelForm):
    DECISION_CHOICES = [
        ('approved', 'Approve'),
        ('rejected', 'Reject'),
    ]

    decision = forms.ChoiceField(
        choices=DECISION_CHOICES,
        widget=forms.RadioSelect(attrs={'class': 'DCF-radio'})
    )

    class Meta:
        model = DCFApprovalTimeline
        fields = ['remarks']
        widgets = {
            'remarks': forms.Textarea(attrs={'class': 'DCF-textarea', 'rows': 3, 'placeholder': 'Add your comments or feedback...'})
        }

    def clean_remarks(self):
        decision = self.cleaned_data.get('decision')
        remarks = self.cleaned_data.get('remarks')

        if decision == 'rejected' and not remarks:
            raise forms.ValidationError("Please provide a reason for rejection")

        return remarks