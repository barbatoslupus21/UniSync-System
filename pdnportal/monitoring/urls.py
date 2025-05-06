from django.urls import path
from . import views

urlpatterns = [
    path('', views.monitoring_dashboard, name='supervisor_monitoring'),
    
    # MONITORING GROUP
    path('create-group/', views.create_monitoring_group, name='create_group'),
    path('edit-group/<int:group_id>/', views.edit_monitoring_group, name='edit_group'),
    path('get-group/<int:group_id>/', views.get_monitoring_group, name='get_group'),
    
    # PRODUCT
    path('add-product/', views.add_product, name='add_product'),
    path('get-product/<int:product_id>/', views.get_product, name='get_product'),
    path('edit-product/<int:product_id>/', views.edit_product, name='edit_product'),
    path('delete-product/<int:product_id>/', views.delete_product, name='delete_product'),
    path('import-products/', views.import_products, name='import_products'),
    path('export-product-template/', views.export_product_template, name='export_product_template'),
    
    # SCHEDULE
    path('add-schedule/', views.add_schedule, name='add_schedule'),
    path('get-schedule/<int:schedule_id>/', views.get_schedule, name='get_schedule'),
    path('edit-schedule/<int:schedule_id>/', views.edit_schedule, name='edit_schedule'),
    path('delete-schedule/<int:schedule_id>/', views.delete_schedule, name='delete_schedule'),
    path('import-schedules/', views.import_schedules, name='import_schedules'),
    path('export-schedule-template/', views.export_schedule_template, name='export_schedule_template'),
    
    # CHART DATA
    path('chart-data/<str:period>/', views.get_chart_data, name='chart_data'),
    path('group-performance/<int:group_id>/', views.get_group_performance, name='group_performance'),
    path('line-performance/<int:group_id>/<str:line_id>/', views.get_line_performance, name='line_performance'),

    # GROUP DASHBOARD
    path('group-dashboard/<int:group_id>/', views.group_dashboard, name='group_dashboard'),
    path('group-dashboard/<int:group_id>/data/', views.group_dashboard_data, name='group_dashboard_data'),

    # LINE DASHBOARD
    path('line-dashboard/', views.production_dashboard, name='line_dashboard'),
]