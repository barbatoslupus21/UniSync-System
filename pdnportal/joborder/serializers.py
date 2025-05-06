from rest_framework import serializers
from joborder.models import JOLogsheet, JORouting
from django.db.models.functions import TruncMonth
from django.db.models import Count
from django.utils.timezone import now
from datetime import timedelta
from django.db import models
from django.db.models.functions import ExtractMonth

class JORequestSerializer(serializers.Serializer):
    labels = serializers.ListField()
    approved_data = serializers.ListField()
    disapproved_data = serializers.ListField()

    @staticmethod
    def get_monthly_jo_data(user):
        start_of_year = now().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

        jo_data = (
            JOLogsheet.objects
            .filter(date_created__gte=start_of_year, prepared_by=user)
            .annotate(month=TruncMonth('date_created'))
            .values('month')
            .annotate(
                approved_count=Count('id', filter=models.Q(status="Closed")),
                disapproved_count=Count('id', filter=models.Q(status="Disapproved"))
            )
            .order_by('month')
        )

        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        approved_counts = [0] * 12
        disapproved_counts = [0] * 12

        for entry in jo_data:
            month_index = entry['month'].month - 1 
            approved_counts[month_index] = entry['approved_count']
            disapproved_counts[month_index] = entry['disapproved_count']

        return {
            "labels": months,
            "approved_data": approved_counts,
            "disapproved_data": disapproved_counts
        }
    
class JORoutingSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='approver.name', read_only=True)
    position = serializers.CharField(source='approver', read_only=True)
    time = serializers.DateTimeField(source='request_at', format="%d %b %y, %I:%M %p")
    
    class Meta:
        model = JORouting
        fields = ['time', 'name', 'position', 'status', 'remarks']


class JORequestApproverSerializer(serializers.Serializer):
    month = serializers.CharField()
    request_count = serializers.IntegerField()

    @classmethod
    def get_monthly_jo_request_count(cls, user):
        qs = (
            JORouting.objects.filter(approver=user)
            .annotate(month=ExtractMonth('request_at'))
            .values('month')
            .annotate(request_count=Count('id'))
        )
        
        ordered_months = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5]
        month_names = {
            1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May',
            6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct',
            11: 'Nov', 12: 'Dec'
        }

        data_dict = {m: 0 for m in ordered_months}

        for item in qs:
            month_number = item['month']
            count = item['request_count']
            if month_number in data_dict:
                data_dict[month_number] = count

        labels = [month_names[m] for m in ordered_months]
        data = [data_dict[m] for m in ordered_months]
        
        return {"labels": labels, "data": data}
    
class JORequestAdminSerializer(serializers.Serializer):
    month = serializers.CharField()
    request_count = serializers.IntegerField()

    @classmethod
    def get_monthly_jo_admin_count(cls, user):
        qs = (
            JORouting.objects.filter(approver=user)
            .annotate(month=ExtractMonth('request_at'))
            .values('month')
            .annotate(request_count=Count('id'))
        )
        
        ordered_months = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5]
        month_names = {
            1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May',
            6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct',
            11: 'Nov', 12: 'Dec'
        }

        data_dict = {m: 0 for m in ordered_months}

        for item in qs:
            month_number = item['month']
            count = item['request_count']
            if month_number in data_dict:
                data_dict[month_number] = count

        labels = [month_names[m] for m in ordered_months]
        data = [data_dict[m] for m in ordered_months]
        
        return {"labels": labels, "data": data}
    
