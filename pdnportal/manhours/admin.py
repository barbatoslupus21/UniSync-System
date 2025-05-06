from django.contrib import admin
from .models import ManhoursLogsheet, Machine, Operators

admin.site.register(ManhoursLogsheet)
admin.site.register(Machine)
admin.site.register(Operators)