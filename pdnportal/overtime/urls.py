from django.urls import path
from . import views

urlpatterns = [
    path('filing/', views.user_filing, name='user_filing'),
    path('admin/', views.admin_filing, name='admin_filing'),
    
    # Shuttle User Assignments (Main table data)
    path('api/shuttle-users/', views.get_shuttle_users, name='get_shuttle_users'),
    path('api/shuttle-users/create/', views.create_shuttle_user, name='create_shuttle_user'),
    path('api/shuttle-users/<int:user_id>/update/', views.update_shuttle_user, name='update_shuttle_user'),
    path('api/shuttle-users/<int:user_id>/delete/', views.delete_shuttle_user, name='delete_shuttle_user'),
    path('api/shuttle-users/template/', views.download_shuttle_template, name='download_shuttle_template'),
    path('api/shuttle-users/import/', views.import_shuttle_users, name='import_shuttle_users'),
    
    path('api/subordinates/', views.get_subordinates, name='get_subordinates'),
    path('api/all-shuttle-users/', views.get_all_shuttle_users_for_group, name='get_all_shuttle_users_for_group'),
    path('api/subordinate-groups/', views.get_subordinate_groups, name='get_subordinate_groups'),
    path('api/subordinate-groups/create/', views.create_subordinate_group, name='create_subordinate_group'),
    path('api/subordinate-groups/<int:group_id>/update/', views.update_subordinate_group, name='update_subordinate_group'),
    path('api/subordinate-groups/<int:group_id>/delete/', views.delete_subordinate_group, name='delete_subordinate_group'),
    
    path('api/check-cutoff/', views.check_cutoff, name='check_cutoff'),
    path('api/check-duplicates/', views.check_duplicate_filings, name='check_duplicate_filings'),
    path('api/verify-passcode/', views.verify_passcode, name='verify_passcode'),
    path('api/submit-overtime/', views.submit_overtime, name='submit_overtime'),
    path('api/overtime-filings/', views.get_overtime_filings, name='get_overtime_filings'),
    path('api/overtime-filings/<int:filing_id>/delete/', views.delete_overtime_filing, name='delete_overtime_filing'),
    
    path('api/shuttle-vehicles/', views.get_shuttle_vehicles, name='get_shuttle_vehicles'),
    path('api/shuttle-vehicles/create/', views.create_shuttle_vehicle, name='create_shuttle_vehicle'),
    path('api/shuttle-vehicles/<int:vehicle_id>/update/', views.update_shuttle_vehicle, name='update_shuttle_vehicle'),
    path('api/shuttle-vehicles/<int:vehicle_id>/delete/', views.delete_shuttle_vehicle, name='delete_shuttle_vehicle'),
    
    path('api/shuttle-providers/', views.get_shuttle_providers, name='get_shuttle_providers'),
    path('api/shuttle-providers/create/', views.create_shuttle_provider, name='create_shuttle_provider'),
    path('api/shuttle-providers/<int:provider_id>/update/', views.update_shuttle_provider, name='update_shuttle_provider'),
    path('api/shuttle-providers/<int:provider_id>/delete/', views.delete_shuttle_provider, name='delete_shuttle_provider'),
    
    path('api/destinations/', views.get_destinations, name='get_destinations'),
    path('api/destinations/available/', views.get_available_destinations, name='get_available_destinations'),
    path('api/destinations/create/', views.create_destination, name='create_destination'),
    path('api/destinations/<int:destination_id>/update/', views.update_destination, name='update_destination'),
    path('api/destinations/<int:destination_id>/delete/', views.delete_destination, name='delete_destination'),
    
    path('api/destination-groups/', views.get_destination_groups, name='get_destination_groups'),
    path('api/destination-groups/create/', views.create_destination_group, name='create_destination_group'),
    path('api/destination-groups/<int:group_id>/update/', views.update_destination_group, name='update_destination_group'),
    path('api/destination-groups/<int:group_id>/delete/', views.delete_destination_group, name='delete_destination_group'),
    
    path('api/user-shuttle-assignments/', views.get_user_shuttle_assignments, name='get_user_shuttle_assignments'),
    path('api/user-shuttle-assignments/update/', views.update_user_shuttle_assignment, name='update_user_shuttle_assignment'),
    
    path('api/holidays/', views.get_holidays, name='get_holidays'),
    path('api/holidays/create/', views.create_holiday, name='create_holiday'),
    path('api/holidays/<int:holiday_id>/delete/', views.delete_holiday, name='delete_holiday'),
    
    path('api/passcode/', views.get_passcode, name='get_passcode'),
    path('api/passcode/update/', views.update_passcode, name='update_passcode'),
    
    path('api/export/', views.export_overtime, name='export_overtime'),
    path('api/export-overview/', views.export_overview_data, name='export_overview_data'),
    path('api/export-shuttle-users/', views.export_shuttle_users, name='export_shuttle_users'),
    path('api/weeks/', views.get_weeks_for_year, name='get_weeks_for_year'),
    path('api/overview/', views.get_overview_data, name='get_overview_data'),
    path('api/check-shifting/', views.check_shifting_filings, name='check_shifting_filings'),
]