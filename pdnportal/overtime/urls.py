# overtime/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Main view
    path('', views.overtime_view, name='overtime'),

    # Employee Group APIs
    path('api/employee-groups/', views.create_employee_group, name='create-employee-group'),
    path('api/employee-groups/<int:group_id>/', views.get_employee_group, name='get-employee-group'),
    path('api/employee-groups/<int:group_id>/update/', views.update_employee_group, name='update-employee-group'),
    path('api/employee-groups/<int:group_id>/delete/', views.delete_employee_group, name='delete-employee-group'),

    # Employee APIs
    path('api/employees/', views.employee_list, name='employee-list'),
    path('api/employees/create/', views.create_employee, name='create-employee'),
    path('api/employees/<int:employee_id>/', views.get_employee, name='get-employee'),
    path('api/employees/<int:employee_id>/update/', views.update_employee, name='update-employee'),
    path('api/employees/<int:employee_id>/delete/', views.delete_employee, name='delete-employee'),
    path('api/import-employees/', views.import_employees, name='import-employees'),

    # Shuttle Assignment APIs
    path('api/shuttle-assignment/', views.shuttle_assignment, name='shuttle-assignment'),
    path('api/import-shuttle/', views.import_shuttle, name='import-shuttle'),

    # OT Filing APIs
    path('api/submit-shifting-ot/', views.submit_shifting_ot, name='submit-shifting-ot'),
    path('api/submit-daily-ot/', views.submit_daily_ot, name='submit-daily-ot'),
    path('api/ot-details/<str:filing_id>/', views.get_ot_details, name='get-ot-details'),
    path('api/change-employee-status/', views.change_employee_status, name='change-employee-status'),

    # Analytics APIs
    path('api/analytics/', views.get_analytics, name='get-analytics'),
    path('api/requestor-analytics/<int:requestor_id>/', views.get_requestor_analytics, name='get-requestor-analytics'),
    path('api/employee-status-chart/', views.get_employee_status_chart, name='get-employee-status-chart'),
    path('api/recent-activity/', views.get_recent_activity, name='get-recent-activity'),

    # Password Management APIs
    path('api/update-password/', views.update_password, name='update-password'),
    path('api/reset-passwords/', views.reset_passwords, name='reset-passwords'),

    # Export APIs
    path('api/export-shifting/', views.export_shifting, name='export-shifting'),
    path('api/export-daily/', views.export_daily, name='export-daily'),
    path('api/export-masterlist/', views.export_masterlist, name='export-masterlist'),
]