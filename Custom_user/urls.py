from django.urls import path
from . import views
from .views import profile_view


urlpatterns = [
     path('login/', views.login_view, name='login'),
     path('logout/', views.logout_view, name='logout'),
     path('add_user/', views.add_user_view, name='add_user'),
     path('profile/', profile_view, name='profile'),
] 
