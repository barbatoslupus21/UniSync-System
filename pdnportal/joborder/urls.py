from django.urls import path
from . import views

urlpatterns = [

    # REQUESTORS
    path('', views.requestor_page, name='requestor-homepage'),
    path('new-jo/', views.create_jo_request, name="create-jo-request"),
    path('job-order-details/<int:jo_id>/', views.get_job_order_details, name='job-order-details'),
    path('cancel-jo-request/<int:jo_id>/', views.cancel_jo_request, name='cancel-job-order'),
    path('close-jo-transaction/<int:jo_id>/', views.close_transaction, name='close-jo'),
    path('hold-request/<int:jo_id>/', views.hold_request, name='hold-request'),
    path('review-job-order/<int:jo_id>/', views.review_job_order, name='review-job-order'),
    path('chart-data/<str:period>/', views.job_order_chart_data, name='jo-chart-data'),
    path('check-approver/', views.check_user_approver, name='check-user-approver'),
    path('search-job-orders/', views.search_job_orders, name='search-job-orders'),

    # FACILITATOR
    path('assign-personnel/', views.job_order_facilitator, name='facilitator'),
    path('analytics/', views.job_order_analytics, name='analytics'),
    path('workload/', views.maintenance_workload, name='workload'), 
    path('assign-incharge/', views.assign_person_in_charge, name='assign-incharge'),
    path('export/', views.export_job_orders, name='export-job-orders'),
    path('get-maintenance-personnel/', views.get_maintenance_personnel, name='get-maintenance-personnel'),

    # OVERALL DASHBOARD
    path('job-order-request-overview/', views.queue_overview, name="queue"),
    path('api/job-order/stats/', views.job_order_stats_api, name='job-order-stats-api'),
    path('api/job-order/queue/', views.job_order_queue_api, name='job-order-queue-api'),
    path('api/job-order/timeline/<str:view_type>/', views.job_order_timeline_api, name='job-order-timeline-api'),
    path('api/job-order/deadlines/', views.job_order_deadlines_api, name='job-order-deadlines-api'),
    path('api/job-order/alerts/', views.job_order_alerts_api, name='job-order-alerts-api'),
    path('api/job-order/compliance-chart/', views.job_order_compliance_chart_api, name='job-order-compliance-chart-api'),
    path('api/job-order/compliance-rate/', views.compliance_rate_api, name='compliance-rate-api'),

    # MAINTENANCE
    path('api/get_job_order_trends/', views.get_job_order_trends, name='get_job_order_trends'),
    path('maintenance/get_upcoming_deadlines/', views.get_upcoming_deadlines, name='get_upcoming_deadlines'),
    path('get-job-order-for-date-setting/<int:jo_id>/', views.get_job_order_for_date_setting, name='get-job-order-for-date-setting'),
    path('set-target-date/', views.set_target_date, name='set_target_date'),
    path('check-preparer-checker/<int:jo_id>/', views.check_preparer_has_checker, name='check_preparer_has_checker'),
    path('complete-job-order/<int:jo_id>/', views.complete_job_order, name='complete_job_order'),
    path('api/maintenance/job-orders/', views.maintenance_job_orders_api, name='maintenance-job-orders-api'),
]