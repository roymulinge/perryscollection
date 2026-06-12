# notifications/urls.py

from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # GET  /api/notifications/             → list all my notifications
    # DELETE /api/notifications/           → clear all
    path('', views.NotificationListAPIView.as_view(), name='notification-list'),

    # POST /api/notifications/mark-read/   → mark one or many as read
    path('mark-read/', views.NotificationMarkReadAPIView.as_view(), name='mark-read'),

    # DELETE /api/notifications/<id>/      → delete one notification
    path('<int:notification_id>/', views.NotificationDeleteAPIView.as_view(), name='notification-delete'),
]