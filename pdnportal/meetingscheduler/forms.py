from django import forms
from django.core.exceptions import ValidationError
from .models import Meeting, MeetingRoom, MeetingType


class MeetingForm(forms.ModelForm):
    """Form for creating and editing meetings."""
    
    class Meta:
        model = Meeting
        fields = ['title', 'description', 'room', 'meeting_type', 'date', 
                  'start_time', 'end_time', 'location', 'attendees']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter meeting title',
                'required': True
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Add description (optional)',
                'rows': 3
            }),
            'room': forms.Select(attrs={
                'class': 'form-control',
                'required': True
            }),
            'meeting_type': forms.Select(attrs={
                'class': 'form-control'
            }),
            'date': forms.DateInput(attrs={
                'class': 'form-control',
                'type': 'date',
                'required': True
            }),
            'start_time': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time',
                'required': True
            }),
            'end_time': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time',
                'required': True
            }),
            'location': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Add location (optional)'
            }),
            'attendees': forms.SelectMultiple(attrs={
                'class': 'form-control',
                'id': 'attendees-select'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['room'].queryset = MeetingRoom.objects.filter(is_active=True)
        self.fields['meeting_type'].queryset = MeetingType.objects.filter(is_active=True)
        self.fields['meeting_type'].required = False
        self.fields['attendees'].required = False

    def clean(self):
        cleaned_data = super().clean()
        start_time = cleaned_data.get('start_time')
        end_time = cleaned_data.get('end_time')
        room = cleaned_data.get('room')
        date = cleaned_data.get('date')

        if start_time and end_time:
            if start_time >= end_time:
                raise ValidationError({
                    'end_time': 'End time must be after start time.'
                })

        if room and date and start_time and end_time:
            exclude_pk = self.instance.pk if self.instance else None
            is_available, conflicting_meeting = Meeting.check_availability(
                room, date, start_time, end_time, exclude_pk
            )
            if not is_available:
                raise ValidationError({
                    'start_time': f'This time slot conflicts with "{conflicting_meeting.title}" '
                                  f'({conflicting_meeting.start_time.strftime("%H:%M")} - '
                                  f'{conflicting_meeting.end_time.strftime("%H:%M")}) in {room.name}.'
                })

        return cleaned_data


class MeetingRoomForm(forms.ModelForm):
    """Form for creating and editing meeting rooms."""
    
    class Meta:
        model = MeetingRoom
        fields = ['name', 'description', 'capacity', 'location', 'color', 'is_active']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter room name',
                'required': True
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Room description (optional)',
                'rows': 3
            }),
            'capacity': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 1
            }),
            'location': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Room location (optional)'
            }),
            'color': forms.TextInput(attrs={
                'class': 'form-control',
                'type': 'color'
            }),
            'is_active': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
        }


class MeetingTypeForm(forms.ModelForm):
    """Form for creating and editing meeting types."""
    
    class Meta:
        model = MeetingType
        fields = ['name', 'icon', 'color', 'is_active']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter type name',
                'required': True
            }),
            'icon': forms.Select(attrs={
                'class': 'form-control'
            }),
            'color': forms.TextInput(attrs={
                'class': 'form-control',
                'type': 'color'
            }),
            'is_active': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
        }
