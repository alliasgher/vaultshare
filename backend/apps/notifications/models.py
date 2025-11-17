"""
Models for notification tracking
"""
from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class EmailNotification(TimeStampedModel):
    """
    Model to track email notifications
    """
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    template_name = models.CharField(max_length=100)
    
    # Context data (stored as JSON)
    context_data = models.JSONField(default=dict)
    
    # Status
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    
    # Brevo tracking
    message_id = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'email_notifications'
        verbose_name = 'Email Notification'
        verbose_name_plural = 'Email Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_sent']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.subject} to {self.recipient}"
