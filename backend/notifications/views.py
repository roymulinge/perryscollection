from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import (
    NotificationSerializer,
    MarkReadSerializer,
)


class NotificationListAPIView(APIView):
    """
    GET /api/notifications/

    Return the authenticated user's notifications.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = (
            Notification.objects
            .filter(recipient=request.user)
            .order_by("-created_at")
        )

        serializer = NotificationSerializer(
            notifications,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class UnreadNotificationListAPIView(APIView):
    """
    GET /api/notifications/unread/

    Return the authenticated user's unread notifications.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = (
            Notification.objects
            .filter(
                recipient=request.user,
                is_read=False,
            )
            .order_by("-created_at")
        )

        serializer = NotificationSerializer(
            notifications,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class MarkNotificationsReadAPIView(APIView):
    """
    PATCH /api/notifications/read/

    Mark selected notifications as read.

    If notification_ids is empty, mark all
    notifications belonging to the user as read.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = MarkReadSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        notification_ids = serializer.validated_data[
            "notification_ids"
        ]

        queryset = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        )

        if notification_ids:
            queryset = queryset.filter(
                id__in=notification_ids,
            )

        updated_count = queryset.update(
            is_read=True,
            read_at=timezone.now(),
        )

        return Response(
            {
                "message": "Notifications marked as read.",
                "updated_count": updated_count,
            },
            status=status.HTTP_200_OK,
        )


class MarkNotificationReadAPIView(APIView):
    """
    PATCH /api/notifications/<notification_id>/read/

    Mark one notification as read.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=request.user,
            )
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()

            notification.save(
                update_fields=[
                    "is_read",
                    "read_at",
                ]
            )

        return Response(
            NotificationSerializer(
                notification
            ).data,
            status=status.HTTP_200_OK,
        )