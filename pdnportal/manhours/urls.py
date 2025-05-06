from django.urls import path
from . import views

urlpatterns = [
    path('', views.manhours, name='manhours'),
    path('create-manhours/', views.create_manhours, name='create_manhours'),
    path('update-manhour/', views.update_manhours, name='update_manhours'),
    path('manhour-details/<int:id>/', views.get_manhours_details, name='get_manhours_details'),
    path('export-report/', views.export_reports, name="export_reports"),
    path('chart-data/', views.get_chart_data, name='get_chart_data'),
    path('machine-performance/', views.get_machine_performance, name='get_machine_performance'),
]
