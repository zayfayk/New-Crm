from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    path('', views.chat_view, name='chat'),
    path('api/create-room/', views.create_private_room, name='create_private_room'),
    path('api/send-message/', views.send_message, name='send_message'),
    path('api/messages/', views.get_messages, name='get_messages'),
    path('api/users/', views.get_users, name='get_users'),
    path('api/mark-read/', views.mark_message_read, name='mark_message_read'),
    path('api/mark-room-read/', views.mark_room_messages_read, name='mark_room_messages_read'),
    path('api/typing-status/', views.typing_status, name='typing_status'),
    path('api/user-presence/', views.user_presence, name='user_presence'),
    path('api/get-notifications/', views.get_notifications, name='get_notifications'),  # Yeni endpoint
]
