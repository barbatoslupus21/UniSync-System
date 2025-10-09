from django import forms
from django.utils import timezone
from .models import DocumentNotification, DocumentCategory, NotificationRecipient

class DocumentNotificationForm(forms.ModelForm):
    # Notification recipient fields
    notify_via_email = forms.BooleanField(
        required=False,
        initial=True,
        label="Send via Email",
        widget=forms.CheckboxInput(attrs={'class': 'JO-checkbox'})
    )
    notify_via_system = forms.BooleanField(
        required=False,
        initial=True,
        label="Notify by System",
        widget=forms.CheckboxInput(attrs={'class': 'JO-checkbox'})
    )
    email_address = forms.EmailField(
        required=False,
        label="Notification Email Address",
        widget=forms.EmailInput(attrs={
            'class': 'JO-input',
            'placeholder': 'Enter email address for notifications'
        })
    )
    cc_email = forms.EmailField(
        required=False,
        label="CC Email Address",
        widget=forms.EmailInput(attrs={
            'class': 'JO-input',
            'placeholder': 'Enter CC email address (optional)'
        })
    )

    def clean(self):
        cleaned = super().clean()
        notify_email = cleaned.get('notify_via_email')
        email = cleaned.get('email_address')

        if notify_email and not email:
            self.add_error('email_address', 'Notification Email Address is required when Send via Email is checked.')

        return cleaned
    class Meta:
        model = DocumentNotification
        fields = [
            'title',
            'category',
            'description',
            'notification_period',
            'due_date',
            'notes'
        ]
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'JO-input',
                'placeholder': 'Enter document title'
            }),
            'category': forms.Select(attrs={
                'class': 'JO-select'
            }),
            'description': forms.Textarea(attrs={
                'class': 'JO-input',
                'rows': 3,
                'placeholder': 'Enter detailed description'
            }),
            'notification_period': forms.NumberInput(attrs={
                'class': 'JO-select',
                'min': 1,
                'placeholder': 'Days before due date to send notification'
            }),
            'due_date': forms.DateInput(attrs={
                'class': 'JO-input',
                'type': 'date'
            }),
            'notes': forms.Textarea(attrs={
                'class': 'JO-input',
                'rows': 2,
                'placeholder': 'Internal notes (optional)'
            })
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        self.fields['category'].queryset = DocumentCategory.objects.filter(is_active=True)

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.user and self.user.is_authenticated:
            instance.created_by = self.user
        
        if not instance.reference_number:
            from django.utils import timezone
            today = timezone.now().date()
            date_str = today.strftime('%Y%m%d')
            base_ref = f'DOC-{date_str}-'
            
            existing_refs = DocumentNotification.objects.filter(
                reference_number__startswith=base_ref
            ).values_list('reference_number', flat=True)
            
            numbers = []
            for ref in existing_refs:
                try:
                    num_part = ref.split('-')[-1]
                    numbers.append(int(num_part))
                except (ValueError, IndexError):
                    continue
            
            next_num = max(numbers) + 1 if numbers else 1
            instance.reference_number = f'{base_ref}{next_num:03d}'
        
        if commit:
            instance.save()
            try:
                nr_defaults = {
                    'user': self.user if self.user and self.user.is_authenticated else None,
                    'email_address': self.cleaned_data.get('email_address') or '',
                    'cc_email': self.cleaned_data.get('cc_email') or '',
                    'notify_via_email': self.cleaned_data.get('notify_via_email', True),
                    'notify_via_system': self.cleaned_data.get('notify_via_system', True),
                    'is_cc': bool(self.cleaned_data.get('cc_email'))
                }
                NotificationRecipient.objects.update_or_create(
                    document=instance,
                    user=nr_defaults['user'],
                    defaults=nr_defaults
                )
                
            except Exception:
                pass
        
        return instance
