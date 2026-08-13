from django.urls import path

from . import views


app_name = "notifications"


urlpatterns = [
    path(
        "",
        views.NotificationListAPIView.as_view(),
        name="notification-list",
    ),
    path(
        "unread/",
        views.UnreadNotificationListAPIView.as_view(),
        name="notification-unread",
    ),
    path(
        "read/",
        views.MarkNotificationsReadAPIView.as_view(),
        name="notification-mark-read",
    ),
    path(
        "<int:notification_id>/read/",
        views.MarkNotificationReadAPIView.as_view(),
        name="notification-mark-one-read",
    ),
]