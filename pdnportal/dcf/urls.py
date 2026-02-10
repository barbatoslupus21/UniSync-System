from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    path('', views.dcf_requestor, name='dcf_requestor'),
    path('new-dcf/', views.create_dcf, name='create_dcf'),
    path('edit-dcf/<int:pk>/', views.edit_dcf, name='edit_dcf'),
    path('cancel-dcf/<int:pk>/', views.cancel_dcf, name='cancel_dcf'),
    path('view-dcf/<int:pk>/', views.view_dcf, name='view_dcf'),

    # Approver URLs
    path('approver/', views.dcf_approver_dashboard, name='dcf_approver'),
    path('approve-modal/<int:pk>/', views.approve_dcf_modal, name='approve_dcf_modal'),
    path('approve/<int:pk>/', views.approve_dcf, name='approve_dcf'),
    path('reject/<int:pk>/', views.reject_dcf, name='reject_dcf'),
    path('cancel-approval/<int:pk>/', views.cancel_dcf_approval, name='cancel_dcf_approval'),

    # API endpoints
    path('api/stats/chart/', views.dcf_stats_chart, name='dcf_stats_chart'),

    # Dashboard chart API endpoints
    path('api/requestor-chart-data/<str:period>/', api_views.get_requestor_chart_data, name='dcf_requestor_chart_data'),
    path('api/approver-chart-data/<str:period>/', api_views.get_approver_chart_data, name='dcf_approver_chart_data'),
]
