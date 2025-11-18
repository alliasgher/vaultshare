"""
Models for file management and access control
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from core.models import TimeStampedModel, SoftDeleteModel
from core.utils import generate_secure_token
import uuid


class FileUpload(TimeStampedModel, SoftDeleteModel):
    """
    Model to store uploaded file metadata
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_files'
    )
    
    # File information
    filename = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(help_text="File size in bytes")
    file_hash = models.CharField(max_length=64, help_text="SHA256 hash")
    content_type = models.CharField(max_length=100)
    
    # S3 storage information
    s3_key = models.CharField(max_length=512, unique=True)
    s3_bucket = models.CharField(max_length=255)
    
    # Access control
    access_token = models.CharField(
        max_length=64,
        unique=True,
        default=generate_secure_token,
        db_index=True
    )
    password_hash = models.CharField(max_length=255, blank=True, null=True)
    
    # Expiry settings
    expiry_hours = models.IntegerField(default=24)
    expires_at = models.DateTimeField()
    
    # View limits
    max_views = models.IntegerField(default=10)
    current_views = models.IntegerField(default=0)
    
    # View session tracking
    session_duration = models.IntegerField(
        default=15,
        help_text="Duration in minutes for a single view session (refreshes within this time don't count as new views)"
    )
    
    # Consumer access control
    require_signin = models.BooleanField(
        default=False,
        help_text="Require consumers to sign in before accessing this file"
    )
    max_views_per_consumer = models.IntegerField(
        default=0,
        help_text="Maximum views allowed per consumer (0 = unlimited per consumer)"
    )
    
    # Download control
    disable_download = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'file_uploads'
        verbose_name = 'File Upload'
        verbose_name_plural = 'File Uploads'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['access_token']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.original_filename} ({self.access_token})"

    def save(self, *args, **kwargs):
        # Set expires_at based on expiry_hours
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=self.expiry_hours)
        super().save(*args, **kwargs)

    def is_expired(self):
        """Check if file access has expired"""
        return timezone.now() > self.expires_at

    def is_view_limit_reached(self):
        """Check if view limit has been reached"""
        return self.current_views >= self.max_views

    def can_access(self):
        """Check if file can be accessed"""
        return (
            self.is_active and
            not self.is_deleted and
            not self.is_expired() and
            not self.is_view_limit_reached()
        )

    def increment_views(self):
        """Increment view counter"""
        self.current_views += 1
        self.save(update_fields=['current_views', 'updated_at'])
    
    def has_active_session(self, consumer_id=None, ip_address=None):
        """
        Check if there's an active view session for this consumer/IP.
        A session is active if there was a successful access within the session_duration.
        """
        from django.utils import timezone
        from datetime import timedelta
        
        session_threshold = timezone.now() - timedelta(minutes=self.session_duration)
        
        # Check for recent successful access
        query = self.access_logs.filter(
            access_granted=True,
            access_method__in=['view', 'download'],
            created_at__gte=session_threshold
        )
        
        if consumer_id:
            query = query.filter(consumer_id=consumer_id)
        elif ip_address:
            query = query.filter(ip_address=ip_address, consumer__isnull=True)
        else:
            return False
        
        return query.exists()

    def get_consumer_view_count(self, consumer_id=None, ip_address=None):
        """
        Get view count for a specific consumer by counting unique sessions.
        A session is defined by the session_duration - multiple accesses within 
        the same session window count as 1 view.
        """
        from django.utils import timezone
        from datetime import timedelta
        
        # Get all successful accesses for this consumer/IP, ordered by time
        if consumer_id:
            logs = self.access_logs.filter(
                consumer_id=consumer_id,
                access_granted=True,
                access_method__in=['view', 'download']
            ).order_by('created_at')
        elif ip_address:
            logs = self.access_logs.filter(
                ip_address=ip_address,
                access_granted=True,
                access_method__in=['view', 'download'],
                consumer__isnull=True
            ).order_by('created_at')
        else:
            return 0
        
        if not logs.exists():
            return 0
        
        # Count unique sessions by grouping accesses within session_duration
        session_count = 0
        last_session_time = None
        session_duration = timedelta(minutes=self.session_duration)
        
        for log in logs:
            if last_session_time is None or (log.created_at - last_session_time) > session_duration:
                # New session started
                session_count += 1
                last_session_time = log.created_at
        
        return session_count

    def has_consumer_exceeded_limit(self, consumer_id=None, ip_address=None):
        """Check if consumer has exceeded their view limit"""
        if self.max_views_per_consumer == 0:
            return False  # Unlimited views per consumer
        
        view_count = self.get_consumer_view_count(consumer_id, ip_address)
        return view_count >= self.max_views_per_consumer

    def get_access_url(self):
        """Generate the access URL for this file"""
        from django.conf import settings
        frontend_url = settings.VAULTSHARE['FRONTEND_URL']
        return f"{frontend_url}/access/{self.access_token}"
    
    def get_session_grouped_logs(self):
        """
        Get access logs grouped by session.
        Returns one log per session, with combined info if both view and download occurred.
        """
        from django.utils import timezone
        from datetime import timedelta
        
        all_logs = self.access_logs.filter(
            access_granted=True
        ).order_by('created_at')
        
        if not all_logs.exists():
            return []
        
        session_duration = timedelta(minutes=self.session_duration)
        grouped_sessions = []
        current_session = None
        
        for log in all_logs:
            # Determine session key (consumer_id or IP)
            session_key = log.consumer_id if log.consumer else log.ip_address
            
            # Check if this belongs to current session
            if current_session and \
               current_session['key'] == session_key and \
               (log.created_at - current_session['first_access']) <= session_duration:
                # Same session - update with latest info
                if log.access_method == 'download':
                    current_session['downloaded'] = True
                if log.access_method == 'view':
                    current_session['viewed'] = True
                current_session['last_access'] = log.created_at
            else:
                # New session
                if current_session:
                    grouped_sessions.append(current_session['log'])
                
                current_session = {
                    'key': session_key,
                    'first_access': log.created_at,
                    'last_access': log.created_at,
                    'viewed': log.access_method == 'view',
                    'downloaded': log.access_method == 'download',
                    'log': log
                }
        
        # Add the last session
        if current_session:
            grouped_sessions.append(current_session['log'])
        
        return grouped_sessions


class AccessLog(TimeStampedModel):
    """
    Model to log file access attempts
    """
    file = models.ForeignKey(
        FileUpload,
        on_delete=models.CASCADE,
        related_name='access_logs'
    )
    
    # Consumer tracking (for signed-in users)
    consumer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='access_logs',
        help_text="Consumer who accessed the file (if signed in)"
    )
    
    # Access information
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Access status
    access_granted = models.BooleanField(default=False)
    access_method = models.CharField(
        max_length=20,
        choices=[
            ('view', 'View'),
            ('download', 'Download'),
        ],
        default='view'
    )
    
    # Failure reason (if access denied)
    failure_reason = models.CharField(
        max_length=100,
        blank=True,
        choices=[
            ('expired', 'File Expired'),
            ('view_limit', 'View Limit Reached'),
            ('wrong_password', 'Wrong Password'),
            ('deleted', 'File Deleted'),
            ('inactive', 'File Inactive'),
        ]
    )
    
    # Geolocation (optional, can be added via external service)
    country = models.CharField(max_length=2, blank=True)
    city = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'access_logs'
        verbose_name = 'Access Log'
        verbose_name_plural = 'Access Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['file', 'created_at']),
            models.Index(fields=['ip_address']),
        ]

    def __str__(self):
        return f"{self.file.filename} - {self.ip_address} - {self.access_granted}"


class FileShare(TimeStampedModel):
    """
    Model to track file shares via email or other methods
    """
    file = models.ForeignKey(
        FileUpload,
        on_delete=models.CASCADE,
        related_name='shares'
    )
    
    shared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shared_files'
    )
    
    # Share method
    share_method = models.CharField(
        max_length=20,
        choices=[
            ('email', 'Email'),
            ('link', 'Link'),
            ('qr', 'QR Code'),
        ],
        default='link'
    )
    
    # Recipient information
    recipient_email = models.EmailField(blank=True)
    
    # Status
    is_notified = models.BooleanField(default=False)
    notified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'file_shares'
        verbose_name = 'File Share'
        verbose_name_plural = 'File Shares'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.file.filename} shared via {self.share_method}"
