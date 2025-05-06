from django.contrib import admin
from .models import UserApprovers, Users, joSettings

admin.site.register(UserApprovers)
admin.site.register(Users)
admin.site.register(joSettings)
