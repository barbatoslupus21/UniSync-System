from django.urls import path
from . import views

urlpatterns = [
    path('', views.homepage, name='homepage'),
    path('login', views.userlogin, name='user-login'),
    path('logout', views.userlogout, name='user-logout'),
    path('download-acknowledge/', views.download_acknowledge_file, name='download_acknowledge_file'),
]
