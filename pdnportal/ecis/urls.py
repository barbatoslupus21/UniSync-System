from django.urls import path
from . import views
from django.views.generic import TemplateView

urlpatterns = [
    # Requestor URLs
    path('', views.ecis_list_requestor, name='ecis_list'),
    path('test-modal/', TemplateView.as_view(template_name='ecis/test_modal.html'), name='test_modal'),
    path('ecis/new/', views.ecis_create, name='ecis_create'),
    path('ecis/<int:pk>/', views.ecis_detail_requestor, name='ecis_detail'),
    path('ecis/<int:pk>/edit/', views.ecis_edit, name='ecis_edit'),
    path('ecis/<int:pk>/cancel/', views.ecis_cancel, name='ecis_cancel'),

    # Facilitator URLs
    path('facilitator/', views.ecis_list_facilitator, name='facilitator_ecis_list'),
    path('facilitator/<int:pk>/', views.ecis_detail_facilitator, name='facilitator_ecis_detail'),
    path('facilitator/<int:pk>/review/', views.ecis_review, name='ecis_review'),

    # Chart data APIs
    path('api/chart-data/', views.ecis_chart_data, name='ecis_chart_data'),
    path('api/requestor-chart-data/', views.ecis_requestor_chart_data, name='ecis_requestor_chart_data'),
]