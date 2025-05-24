from django.urls import path
from . import views

urlpatterns = [
    path('overview', views.overview, name='overview'),
    path('api/layout/', views.get_dashboard_layout, name='overview-layout'),
    path('api/layout/save/', views.save_dashboard_layout, name='save_layout'),
    
    # QuickNotes endpoints
    path('api/notes/<str:widget_id>/', views.get_quick_notes, name='get_notes'),
    path('api/notes/<str:widget_id>/create/', views.create_quick_note, name='create_note'),
    path('api/notes/delete/<int:note_id>/', views.delete_quick_note, name='delete_note'),
    
    # Calendar endpoints
    path('api/calendar/<str:widget_id>/', views.get_calendar_events, name='get_events'),
    path('api/calendar/<str:widget_id>/create/', views.create_calendar_event, name='create_event'),
    path('api/calendar/update/<int:event_id>/', views.update_calendar_event, name='update_event'),
    path('api/calendar/delete/<int:event_id>/', views.delete_calendar_event, name='delete_event'),
]
