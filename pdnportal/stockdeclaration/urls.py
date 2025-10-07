from django.urls import path
from . import views

urlpatterns = [
    path('', views.stock_declaration_home, name='stock_declaration_home'),
    path('edit/<int:declaration_id>/', views.edit_stock_declaration, name='edit_stock_declaration'),
    path('cancel/<int:declaration_id>/', views.cancel_stock_declaration, name='cancel_stock_declaration'),
    path('intransit/<int:declaration_id>/', views.mark_intransit_stock_declaration, name='mark_intransit_stock_declaration'),
    path('receive/<int:declaration_id>/', views.receive_stock_declaration, name='receive_stock_declaration'),
    path('export/', views.export_stock_declaration_report, name='export_stock_declaration_report'),
    path('api/chart-data/', views.stock_declaration_chart_data, name='stock_declaration_chart_data'),
    path('api/notifications/', views.stock_notifications_api, name='stock_notifications_api'),
]
