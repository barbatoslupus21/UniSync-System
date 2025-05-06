from rest_framework import serializers
from .models import ManhoursLogsheet

class ManhoursLogsheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManhoursLogsheet
        fields = ['shift', 'manhours', 'output', 'date_submitted']