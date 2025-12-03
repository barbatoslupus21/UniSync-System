from django.urls import path
from . import views

urlpatterns = [
    # Main page
    path('', views.meeting_list, name='meeting_list'),
    
    # Meeting API endpoints
    path('api/meetings/', views.get_meetings_by_date, name='get_meetings_by_date'),
    path('api/meetings/create/', views.create_meeting, name='create_meeting'),
    path('api/meetings/<int:meeting_id>/', views.get_meeting_detail, name='get_meeting_detail'),
    path('api/meetings/<int:meeting_id>/update/', views.update_meeting, name='update_meeting'),
    path('api/meetings/<int:meeting_id>/delete/', views.delete_meeting, name='delete_meeting'),
    
    # Calendar events
    path('api/calendar/', views.get_calendar_events, name='get_calendar_events'),
    
    # Utility endpoints
    path('api/check-availability/', views.check_availability, name='check_availability'),
    path('api/rooms/', views.get_rooms, name='get_rooms'),
    path('api/types/', views.get_meeting_types, name='get_meeting_types'),
    
    # Admin API endpoints for settings
    path('api/admin/rooms/', views.get_all_rooms, name='get_all_rooms'),
    path('api/admin/rooms/create/', views.create_room, name='create_room'),
    path('api/admin/rooms/<int:room_id>/update/', views.update_room, name='update_room'),
    path('api/admin/rooms/<int:room_id>/delete/', views.delete_room, name='delete_room'),
    path('api/admin/types/', views.get_all_meeting_types, name='get_all_meeting_types'),
    path('api/admin/types/create/', views.create_meeting_type, name='create_meeting_type'),
    path('api/admin/types/<int:type_id>/update/', views.update_meeting_type, name='update_meeting_type'),
    path('api/admin/types/<int:type_id>/delete/', views.delete_meeting_type, name='delete_meeting_type'),
    path('api/admin/export/', views.export_meetings, name='export_meetings'),
]
