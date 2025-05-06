from rest_framework import serializers
from django.db.models import Sum
from .models import ProductionSchedulePlan, ProductionOutput

class MonthlyOutputSerializer(serializers.Serializer):
    month = serializers.CharField()
    am_percentage = serializers.FloatField()
    pm_percentage = serializers.FloatField()

class ProductionOutputSerializer(serializers.ModelSerializer):
    line_name = serializers.CharField(source='line.line_name', read_only=True)
    product_name = serializers.CharField(source='schedule_plan.product_number.product_name', read_only=True)
    schedule_plan_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionOutput
        fields = [
            'id', 
            'monitoring', 
            'schedule_plan', 
            'line', 
            'line_name',
            'product_name',
            'shift', 
            'quantity_produced', 
            'recorded_at',
            'schedule_plan_details'
        ]
    
    def get_schedule_plan_details(self, obj):
        return {
            'planned_qty': obj.schedule_plan.planned_qty,
            'status': obj.schedule_plan.status,
            'product_number': obj.schedule_plan.product_number.product_name
        }
