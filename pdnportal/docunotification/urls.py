from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.docunotification_view, name='docunotification'),
    path('delete-document/<int:document_id>/', views.delete_document, name='delete_document'),
    path('api/notifications/', views.document_notifications_api, name='document_notifications_api'),
    path('api/confirm-notifications/', views.confirm_document_notification, name='confirm_document_notifications'),
]
