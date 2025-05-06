from django.urls import path
from .import views

urlpatterns = [
    
    path('account-settings/', views.user_management, name="account_settings"),
    path('create/', views.create_user, name='create'),
    path('user_edit/<int:user_id>/', views.edit_user, name='edit'),
    
    # Get user data for editing
    path('get_user_data/<int:user_id>/', views.get_user_data, name='get_user_data'),
    
    # Delete user
    path('delete/<int:user_id>/', views.delete_user, name='delete'),
    
    # Toggle user status
    path('toggle-status/<int:user_id>/', views.toggle_user_status, name='toggle_status'),
    path('get-potential-approvers/', views.get_potential_approvers, name='get_potential_approvers'),
]
