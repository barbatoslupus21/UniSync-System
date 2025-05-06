from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('',include('portalusers.urls')),
    path('overview/',include('overview.urls')),
    path('joborder/', include('joborder.urls')),
    path('notification/', include('notification.urls')),
    path('manhours/', include('manhours.urls')),
    path('kanban/', include('naganuma.urls')),
    path('monitoring/', include('monitoring.urls')),
    path('settings/', include('settings.urls')),
    path('material/', include('materialrequest.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)