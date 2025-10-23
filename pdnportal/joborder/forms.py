from django import forms
from .models import JOLogsheet
from settings.models import Line

class JobOrderRequestForm(forms.ModelForm):
    class Meta:
        model = JOLogsheet
        fields = ['line', 'details']
        widgets = {
            'line': forms.Select(attrs={'class': 'JO-select'}),
            'details': forms.Textarea(attrs={'rows': 4, 'class': 'JO-textarea'}),
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

        # Filter lines to only show user's assigned lines
        if self.user and hasattr(self.user, 'line') and self.user.line.exists():
            self.fields['line'].queryset = self.user.line.all()
        else:
            self.fields['line'].queryset = Line.objects.none()

        # Set default line if user has lines
        if self.user and hasattr(self.user, 'line') and self.user.line.exists():
            self.fields['line'].initial = self.user.line.first()