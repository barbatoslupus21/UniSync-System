from django.contrib import admin
from .models import Monitoring, Product, RecentActivity, ProductionSchedulePlan, ProductionOutput, WorkCenter, ProductionSheetManpower, ProductionSheet, HourlyOutput, PerformanceMetric, SupervisorToMonitor, LineToMonitor, OutputLog

admin.site.register(Monitoring)
admin.site.register(Product)
admin.site.register(ProductionSchedulePlan)
admin.site.register(ProductionOutput)
admin.site.register(WorkCenter)
admin.site.register(ProductionSheetManpower)
admin.site.register(ProductionSheet)
admin.site.register(HourlyOutput)
admin.site.register(PerformanceMetric)
admin.site.register(SupervisorToMonitor)
admin.site.register(LineToMonitor)
admin.site.register(OutputLog)
admin.site.register(RecentActivity)

