"""
Custom User model for VaultShare
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import TimeStampedModel


class User(AbstractUser, TimeStampedModel):
    """
    Custom user model extending Django's AbstractUser
    """
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=255, blank=True, null=True)
    
    # Storage quota tracking
    storage_used = models.BigIntegerField(default=0, help_text="Storage used in bytes")
    storage_quota = models.BigIntegerField(
        default=5 * 1024 * 1024 * 1024,  # 5 GB default
        help_text="Storage quota in bytes"
    )
    
    # Account status
    is_premium = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

    def has_storage_available(self, file_size):
        """Check if user has enough storage for a file"""
        return (self.storage_used + file_size) <= self.storage_quota

    def update_storage_used(self, size_delta):
        """Update user's storage usage"""
        self.storage_used += size_delta
        self.save(update_fields=['storage_used', 'updated_at'])
