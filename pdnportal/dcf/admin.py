from django.contrib import admin
from .models import DCF, DCFApprovalTimeline, DCFNumberSetting

admin.site.register(DCF)
admin.site.register(DCFApprovalTimeline)
admin.site.register(DCFNumberSetting)
