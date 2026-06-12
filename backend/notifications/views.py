# notifications/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer, MarkReadSerializer


class NotificationListAPIView(APIView):
    """
    GET  /api/notifications/        → list my notifications
    DELETE /api/notifications/      → clear all my notifications
    
    Supports query param: ?unread=true → only unread notifications
    """
    permission_classes = [IsAuthenticated]  # must be logged in

    def get(self, request):
        # Start with all notifications for this user
        queryset = Notification.objects.filter(recipient=request.user)

        # Optional filter: ?unread=true
        # This lets the frontend badge show just the unread count
        unread_only = request.query_params.get('unread')
        if unread_only == 'true':
            queryset = queryset.filter(is_read=False)

        serializer = NotificationSerializer(queryset, many=True)

        # Also return unread count in the response —
        # useful for the bell badge in the navbar
        unread_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()

        return Response({
            'count': queryset.count(),
            'unread_count': unread_count,
            'results': serializer.data
        })

    def delete(self, request):
        # Hard delete all notifications for this user
        Notification.objects.filter(recipient=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationMarkReadAPIView(APIView):
    """
    POST /api/notifications/mark-read/
    
    Body: { "notification_ids": [1, 2, 3] }
    Empty list [] means mark ALL as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MarkReadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        ids = serializer.validated_data['notification_ids']
        now = timezone.now()  # capture current time once

        if ids:
            # Mark only specified notifications as read
            # .filter(recipient=request.user) ensures users can't mark
            # other people's notifications as read — security check
            updated = Notification.objects.filter(
                id__in=ids,
                recipient=request.user,
                is_read=False  # only update unread ones (efficiency)
            ).update(is_read=True, read_at=now)
        else:
            # Empty list = mark ALL as read
            updated = Notification.objects.filter(
                recipient=request.user,
                is_read=False
            ).update(is_read=True, read_at=now)

        return Response({
            'message': f'{updated} notification(s) marked as read.'
        })


class NotificationDeleteAPIView(APIView):
    """
    DELETE /api/notifications/<id>/   → delete a single notification
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        try:
            # .get() with recipient=request.user prevents users
            # from deleting each other's notifications
            notification = Notification.objects.get(
                id=notification_id,
                recipient=request.user
            )
            notification.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )