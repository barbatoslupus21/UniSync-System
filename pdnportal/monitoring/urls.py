from django.urls import path
from . import views

urlpatterns = [
    path('', views.facilitator_dashboard, name='monitoring_dashboard'),
    
    path('create-group/', views.create_monitoring_group, name='create_group'),
    path('edit-group/<int:group_id>/', views.edit_monitoring_group, name='edit_monitoring_group'),
    path('get-group/<int:group_id>/', views.get_monitoring_group, name='get_monitoring_group'),
    path('get-available-options/<int:group_id>/', views.get_available_options, name='get_available_options'),
    path('delete-group/<int:group_id>/', views.delete_monitoring_group, name='delete_monitoring_group'),
    
    path('group-detail/<int:group_id>/', views.group_detail, name='group_detail'),
    path('group-detail/<int:group_id>/data/', views.group_dashboard_data, name='group_dashboard_data'),
    path('group-detail/<int:group_id>/export/', views.export_group_data, name='export_group_data'),
    
    path('product/add/', views.add_product, name='add_product'),
    path('product/<int:product_id>/', views.get_product, name='get_product'),
    path('product/<int:product_id>/edit/', views.edit_product, name='edit_product'),
    path('product/<int:product_id>/delete/', views.delete_product, name='delete_product'),
    path('product/import/', views.import_products, name='import_products'),
    path('product/export-template/', views.export_product_template, name='export_product_template'),
    
    path('schedule/add/', views.add_schedule, name='add_schedule'),
    path('schedule/<int:schedule_id>/', views.get_schedule, name='get_schedule'),
    path('schedule/<int:schedule_id>/edit/', views.edit_schedule, name='edit_schedule'),
    path('schedule/<int:schedule_id>/delete/', views.delete_schedule, name='delete_schedule'),
    path('schedule/import/', views.import_schedules, name='import_schedules'),
    path('schedule/export-template/', views.export_schedule_template, name='export_schedule_template'),
    
    path('chart-data/', views.get_chart_data, name='chart_data'),
    path('performance-data/<int:group_id>/', views.get_performance_data, name='get_performance_data'),
    
     # GROUP DASHBOARD - Enhanced
    path('group-dashboard/<int:group_id>/', views.group_dashboard, name='group_dashboard'),
    path('group-dashboard/<int:group_id>/data/', views.group_dashboard_data, name='group_dashboard_data'),
    path('group-dashboard/<int:group_id>/pie-charts/', views.group_dashboard_pie_charts, name='group_dashboard_pie_charts'),
    path('group-dashboard/<int:group_id>/metrics/', views.get_real_time_metrics, name='group_real_time_metrics'),
    
    # Additional dashboard endpoints for enhanced functionality
    path('group-dashboard/<int:group_id>/export/', views.export_dashboard_data, name='export_dashboard_data'),
    path('group-dashboard/<int:group_id>/summary/', views.get_dashboard_summary, name='dashboard_summary'),
    
    # LINE DASHBOARD
    path('line-dashboard/', views.production_dashboard, name='line_dashboard'),

    # FACILITATOR DASHBOARD
    path('facilitator/chart-data/', views.facilitator_chart_data, name='facilitator_chart_data'),

    # FACILITATOR GROUP DETAIL
    path('facilitator/group/<int:group_id>/', views.facilitator_group_detail, name='facilitator_group_detail'),
    path('facilitator/group/<int:group_id>/chart-data/', views.facilitator_group_chart_data, name='facilitator_group_chart_data'),
    path('facilitator/group/<int:group_id>/export-output/', views.facilitator_export_output_data, name='facilitator_export_output_data'),
]