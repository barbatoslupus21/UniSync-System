from django.contrib import admin
from .models import GreenControlNumber, YellowControlNumber, WhiteControlNumber, OrangeControlNumber, JOLogsheet, JORouting

admin.site.register(GreenControlNumber)
admin.site.register(WhiteControlNumber)
admin.site.register(YellowControlNumber)
admin.site.register(OrangeControlNumber)
admin.site.register(JOLogsheet)
admin.site.register(JORouting)
