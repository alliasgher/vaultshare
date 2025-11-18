"""
Cleanup tasks for expired files and orphaned data
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.db.models import Q, F
from apps.files.models import FileUpload
from apps.files.s3_utils import S3Manager

logger = logging.getLogger(__name__)


class FileCleanupService:
    """Service for cleaning up expired files"""
    
    def __init__(self):
        self.s3_manager = S3Manager()
        self.batch_size = settings.VAULTSHARE.get('CLEANUP_BATCH_SIZE', 100)
    
    def cleanup_expired_files(self):
        """
        Delete expired files from database and S3
        Includes files that:
        - Have passed their expiration date
        - Have reached their view limit
        - Are older than MAX_FILE_AGE_DAYS (30 days by default)
        
        Returns:
            dict: Statistics about cleanup operation
        """
        now = timezone.now()
        max_age_days = settings.VAULTSHARE.get('MAX_FILE_AGE_DAYS', 30)
        age_threshold = now - timedelta(days=max_age_days)
        
        # Find expired files (by expiry date, view limit, OR age)
        expired_files = FileUpload.objects.filter(
            Q(expires_at__lt=now) | 
            Q(current_views__gte=F('max_views')) |
            Q(created_at__lt=age_threshold),  # Delete files older than MAX_FILE_AGE_DAYS
            is_deleted=False
        )[:self.batch_size]
        
        stats = {
            'total_processed': 0,
            'deleted_from_db': 0,
            'deleted_from_s3': 0,
            'failed': 0,
            'storage_freed': 0,
            'deleted_by_expiry': 0,
            'deleted_by_views': 0,
            'deleted_by_age': 0,
        }
        
        for file_upload in expired_files:
            try:
                stats['total_processed'] += 1
                
                # Track deletion reason
                if file_upload.expires_at < now:
                    stats['deleted_by_expiry'] += 1
                elif file_upload.current_views >= file_upload.max_views:
                    stats['deleted_by_views'] += 1
                elif file_upload.created_at < age_threshold:
                    stats['deleted_by_age'] += 1
                
                # Delete from S3
                if self.s3_manager.delete_file(file_upload.s3_key):
                    stats['deleted_from_s3'] += 1
                    stats['storage_freed'] += file_upload.file_size
                
                # Update user storage
                if file_upload.user:
                    file_upload.user.update_storage_used(-file_upload.file_size)
                
                # Soft delete the file record
                file_upload.soft_delete()
                stats['deleted_from_db'] += 1
                
                logger.info(f"Cleaned up expired file: {file_upload.id}")
                
            except Exception as e:
                stats['failed'] += 1
                logger.error(f"Error cleaning up file {file_upload.id}: {e}")
        
        logger.info(f"Cleanup completed: {stats}")
        return stats
    
    def cleanup_orphaned_s3_files(self):
        """
        Find and delete S3 files that don't have database records
        (Advanced feature - be careful with this)
        """
        # This would require listing all S3 objects and comparing with DB
        # Left as a placeholder for future implementation
        pass
    
    def notify_expiring_files(self, hours_threshold=24):
        """
        Send notifications for files that will expire soon
        
        Args:
            hours_threshold: Notify files expiring within this many hours
        
        Returns:
            int: Number of notifications sent
        """
        from apps.notifications.services import send_file_expiring_notification
        
        now = timezone.now()
        threshold = now + timedelta(hours=hours_threshold)
        
        # Find files expiring soon that haven't been notified yet
        expiring_files = FileUpload.objects.filter(
            expires_at__gt=now,
            expires_at__lte=threshold,
            is_active=True,
            is_deleted=False
        )
        
        notifications_sent = 0
        
        for file_upload in expiring_files:
            try:
                hours_remaining = (file_upload.expires_at - now).total_seconds() / 3600
                send_file_expiring_notification(file_upload, int(hours_remaining))
                notifications_sent += 1
            except Exception as e:
                logger.error(f"Error sending expiry notification for {file_upload.id}: {e}")
        
        logger.info(f"Sent {notifications_sent} expiry notifications")
        return notifications_sent


def run_cleanup():
    """
    Main cleanup function to be called by scheduler
    """
    service = FileCleanupService()
    
    logger.info("Starting cleanup job...")
    
    # Cleanup expired files
    cleanup_stats = service.cleanup_expired_files()
    
    # Send expiry notifications (24 hours before expiration)
    notifications = service.notify_expiring_files(hours_threshold=24)
    
    result = {
        'cleanup': cleanup_stats,
        'notifications_sent': notifications
    }
    
    logger.info(f"Cleanup job completed: {result}")
    return result
