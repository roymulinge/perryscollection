# notifications/serializers.py

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for reading notifications.
    We expose everything the frontend needs to render a notification bell/list.
    """

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'target_url',
            'is_read',
            'read_at',
            'created_at',
        ]
        # All fields are read-only from the user's perspective —
        # users don't create notifications, only read/dismiss them
        read_only_fields = fields


class MarkReadSerializer(serializers.Serializer):
    """
    Request body for bulk mark-as-read.
    
    The frontend sends: { "notification_ids": [1, 2, 3] }
    If notification_ids is empty list, we mark ALL as read.
    """
    # allow_empty=True means [] is valid — meaning "mark all read"
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True
    )