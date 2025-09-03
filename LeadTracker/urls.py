from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('dashboard/', views.dashboardView, name='dashboardView'),
    path('create/', views.create_system_user, name='create_system_user'),  # Updated to match renamed view
    path('update/<int:record_id>/', views.update_record, name='update_record'),
    path('delete/<int:record_id>/', views.delete_record, name='delete_record'),
    path('view/<int:customer_id>/', views.view_customer, name='view_customer'),
    path('edit/<int:customer_id>/', views.edit_customer, name='edit_customer'),
    path('delete-customer/<int:customer_id>/', views.delete_customer, name='delete_customer'),
    path('analytics/', views.analytics_view, name='analytics_view'),
    path('api/records/', views.get_user_records, name='get_user_records'),
    path('create-field-template/', views.create_field_template, name='create_field_template'),
    path('export-to-excel/', views.export_to_excel, name='export_to_excel'),
    path('create-client/', views.create_client_record, name='create_client_record'),
    path('customer/<int:customer_id>/', views.customer_detail, name='customer_detail'),
]