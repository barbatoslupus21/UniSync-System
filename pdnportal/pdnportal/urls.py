from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from ecis import views as ecis_views

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
    path('chat/', include('chat.urls')),
    path('dcf/', include('dcf.urls')),
    path('ecis/', include('ecis.urls')),
    path('overtime/', include('overtime.urls')),

    # Direct access to ECIS chart data API
    path('ecis/api/chart-data/', ecis_views.ecis_chart_data, name='ecis_chart_data_direct'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)