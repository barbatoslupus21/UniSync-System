from django import forms
from django.utils import timezone
from .models import ECIS
from .utils import generate_ecis_number

class ECISForm(forms.ModelForm):
    # Add users-line field to handle the line selection from frontend
    users_line = forms.CharField(required=False, widget=forms.HiddenInput())
    
    class Meta:
        model = ECIS
        fields = [
            'category', 'department', 'requested_by', 'customer',
            'line_supervisor', 'affected_parts', 'details_change',
            'implementation_date'
        ]
        widgets = {
            'implementation_date': forms.DateInput(attrs={'type': 'date'}),
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        # Handle the users-line field from the form data
        if self.data and 'users-line' in self.data:
            self.data = self.data.copy()
            self.data['users_line'] = self.data['users-line']

        # When editing an existing ECIS, we'll keep the original category
        if self.instance.pk:
            # Store the original category
            self.original_category = self.instance.category

            # Update status if it was On Hold
            if self.instance.status == 'On Hold':
                self.instance.status = 'For Review'

    def save(self, commit=True):
        ecis = super().save(commit=False)

        if not ecis.pk:
            # For new ECIS, generate number and set created_by
            ecis.number = generate_ecis_number(self.cleaned_data['category'])
            ecis.created_by = self.user
            
            # Set the line if provided
            if self.cleaned_data.get('users_line'):
                from settings.models import Line
                try:
                    line = Line.objects.get(id=self.cleaned_data['users_line'])
                    ecis.line = line
                except Line.DoesNotExist:
                    pass  # Line not found, leave as None
        else:
            # For existing ECIS, always keep the original category
            ecis.category = self.original_category

        # Update line if provided in the form (for both create and edit)
        users_line_val = self.cleaned_data.get('users_line')
        if users_line_val:
            from settings.models import Line
            try:
                line = Line.objects.get(id=users_line_val)
                ecis.line = line
            except Line.DoesNotExist:
                pass

        ecis.last_updated = timezone.now()

        if commit:
            ecis.save()

        return ecis

    def clean_users_line(self):
        users_line = self.cleaned_data.get('users_line')
        if users_line:
            try:
                line_id = int(users_line)
                from settings.models import Line
                # Check if the line exists and belongs to the user
                if not self.user.line.filter(id=line_id).exists():
                    raise forms.ValidationError("Invalid line selected.")
                return str(line_id)
            except (ValueError, TypeError):
                raise forms.ValidationError("Invalid line ID.")
        return users_line

class FacilitatorReviewForm(forms.Form):
    DECISION_CHOICES = [
        ('approve', 'Approve Request'),
        ('hold', 'Place on Hold'),
        ('revise', 'Needs Revision'),
    ]

    decision = forms.ChoiceField(choices=DECISION_CHOICES, widget=forms.RadioSelect)
    remarks = forms.CharField(widget=forms.Textarea, required=False)

    def clean(self):
        cleaned_data = super().clean()
        decision = cleaned_data.get('decision')
        remarks = cleaned_data.get('remarks')

        if (decision == 'hold' or decision == 'revise') and not remarks:
            self.add_error('remarks', 'Remarks are required when placing a request on hold or requesting revisions.')

        return cleaned_data

class CancelRequestForm(forms.Form):
    remarks = forms.CharField(widget=forms.Textarea, required=False)