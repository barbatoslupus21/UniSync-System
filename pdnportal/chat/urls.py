from django.urls import path
from . import views

urlpatterns = [
    path('', views.chat_view, name='chat'),
    path('api/chats/', views.get_chats, name='get_chats'),
    path('api/chats/<int:chat_id>/', views.get_chat, name='get_chat'),
    path('api/contacts/', views.get_contacts, name='get_contacts'),
    path('api/contacts/search/', views.search_contacts, name='search_contacts'),
    path('api/chats/direct/<int:user_id>/', views.create_direct_chat, name='create_direct_chat'),
    path('api/chats/group/', views.create_group_chat, name='create_group_chat'),
    path('api/chats/<int:chat_id>/members/', views.add_group_members, name='add_group_members'),
    path('api/chats/<int:chat_id>/available-contacts/', views.get_available_contacts, name='get_available_contacts'),
    path('api/chats/<int:chat_id>/rename/', views.rename_group, name='rename_group'),
    path('api/chats/<int:chat_id>/leave/', views.leave_group, name='leave_group'),
    path('api/messages/forward/', views.forward_message, name='forward_message'),
    path('api/upload/', views.upload_file, name='upload_file'),
    path('api/chats/<int:chat_id>/search/', views.search_messages, name='search_messages'),
    path('api/user/current/', views.get_current_user, name='get_current_user'),
    path('api/chats/<int:chat_id>/messages/', views.send_message, name='send_message'),
    path('api/chats/<int:chat_id>/read/', views.mark_messages_read, name='mark_messages_read'),
    path('api/messages/<int:message_id>/file/', views.get_message_file, name='get_message_file'),
    path('api/messages/<int:message_id>/', views.delete_message, name='delete_message')
]