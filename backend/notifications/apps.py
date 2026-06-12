# notifications/apps.py

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        """
        Django calls this when the app is fully loaded.
        We import signals here so they get registered.
        If you don't do this, the signals file just sits there and never runs.
        """
        import notifications.signals  # noqa — the import itself registers the signal