from django.urls import path
from . import views

urlpatterns = [

    # REQUESTORS  
    path('', views.requestor_page, name='requestor-homepage'),
    path('new-jo/', views.create_jo_request, name="create-jo-request"),
    path('job-order-details/<int:jo_id>/', views.get_job_order_details, name='job-order-details'),
    path('cancel-jo-request/<int:jo_id>/', views.cancel_jo_request, name='cancel-job-order'),
    path('close-jo-transaction/<int:jo_id>/', views.close_transaction, name='close-jo'),
    path('chart-data/<str:period>/', views.job_order_chart_data, name='jo-chart-data'),

    # APPROVERS AND CHECKING
    path('job-order-approval/', views.supervisor_view, name='approval'),
    path('job-order-chart-data/<str:period>/', views.approver_job_order_chart_data, name='job_order_chart_data'),
    path('approve-job-order/', views.approve_job_order, name='approve_job_order'),
    path('approve-checking/', views.approve_checking, name='approve_checking'),
    path('reject-job-order/', views.reject_job_order, name='reject_job_order'),
    path('reject-checking/', views.reject_checking, name='reject_checking'),

    # FACILITATOR 
    path('assign-personnel/', views.job_order_facilitator, name='facilitator'),
    path('analytics/', views.job_order_analytics, name='analytics'),
    path('workload/', views.maintenance_workload, name='workload'),
    path('assign-incharge/', views.assign_person_in_charge, name='assign-incharge'),
    path('export/', views.export_job_orders, name='export-job-orders'),

    # OVERALL DASHBOARD
    path('job-order-request-overview/', views.queue_overview, name="queue"),
    path('api/job-order/stats/', views.job_order_stats_api, name='job-order-stats-api'),
    path('api/job-order/timeline/<str:view_type>/', views.job_order_timeline_api, name='job-order-timeline-api'),
    path('api/job-order/deadlines/', views.job_order_deadlines_api, name='job-order-deadlines-api'),
    path('api/job-order/alerts/', views.job_order_alerts_api, name='job-order-alerts-api'),    

    # MAINTENANCE
    path('maintenance/', views.maintenance_personnel, name="maintenance"),
    path('api/get_job_order_trends/', views.get_job_order_trends, name='get_job_order_trends'),
    path('maintenance/get_upcoming_deadlines/', views.get_upcoming_deadlines, name='get_upcoming_deadlines'),
    path('set-target-date/', views.set_target_date, name='set_target_date'),
    path('complete-request/', views.complete_job_order, name='complete_job_order'),
]