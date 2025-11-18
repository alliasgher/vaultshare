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
        Delete expired files from database and storage (R2/Firebase/Local)
        
        Files older than MAX_FILE_AGE_DAYS (30 days) are HARD DELETED (completely removed).
        Files that expired recently are SOFT DELETED (analytics preserved for ~30 days).
        
        Hard delete criteria:
        - Created more than MAX_FILE_AGE_DAYS ago (30 days)
        
        Soft delete criteria:
        - Expired by expiration date (but < 30 days old)
        - Reached view limit (but < 30 days old)
        
        Returns:
            dict: Statistics about cleanup operation
        """
        now = timezone.now()
        max_age_days = settings.VAULTSHARE.get('MAX_FILE_AGE_DAYS', 30)
        age_threshold = now - timedelta(days=max_age_days)
        
        # HARD DELETE: Files older than 30 days (completely remove from DB)
        old_files = FileUpload.objects.filter(
            created_at__lt=age_threshold
        )[:self.batch_size]
        
        # SOFT DELETE: Recently expired files (keep analytics for now)
        expired_files = FileUpload.objects.filter(
            Q(expires_at__lt=now) | Q(current_views__gte=F('max_views')),
            created_at__gte=age_threshold,  # Only files < 30 days old
            is_deleted=False
        )[:self.batch_size]
        
        stats = {
            'total_processed': 0,
            'hard_deleted': 0,
            'soft_deleted': 0,
            'deleted_from_storage': 0,
            'failed': 0,
            'storage_freed': 0,
            'deleted_by_expiry': 0,
            'deleted_by_views': 0,
            'deleted_by_age': 0,
        }
        
        # HARD DELETE old files (> 30 days)
        for file_upload in old_files:
            try:
                stats['total_processed'] += 1
                stats['deleted_by_age'] += 1
                
                # Delete from storage (R2/Firebase/Local)
                if self.s3_manager.delete_file(file_upload.s3_key):
                    stats['deleted_from_storage'] += 1
                    stats['storage_freed'] += file_upload.file_size
                
                # Update user storage (if user still exists)
                if file_upload.user:
                    try:
                        file_upload.user.update_storage_used(-file_upload.file_size)
                    except:
                        pass  # User may have been deleted
                
                # HARD DELETE - completely remove from database
                file_upload.delete()
                stats['hard_deleted'] += 1
                
                logger.info(f"Hard deleted old file (30+ days): {file_upload.id}")
                
            except Exception as e:
                stats['failed'] += 1
                logger.error(f"Error hard deleting file {file_upload.id}: {e}")
        
        # SOFT DELETE recently expired files (preserve analytics)
        for file_upload in expired_files:
            try:
                stats['total_processed'] += 1
                
                # Track deletion reason
                if file_upload.expires_at < now:
                    stats['deleted_by_expiry'] += 1
                elif file_upload.current_views >= file_upload.max_views:
                    stats['deleted_by_views'] += 1
                
                # Delete from storage (R2/Firebase/Local)
                if self.s3_manager.delete_file(file_upload.s3_key):
                    stats['deleted_from_storage'] += 1
                    stats['storage_freed'] += file_upload.file_size
                
                # Update user storage
                if file_upload.user:
                    file_upload.user.update_storage_used(-file_upload.file_size)
                
                # SOFT DELETE - keep database record for analytics
                file_upload.soft_delete()
                stats['soft_deleted'] += 1
                
                logger.info(f"Soft deleted expired file: {file_upload.id}")
                
            except Exception as e:
                stats['failed'] += 1
                logger.error(f"Error soft deleting file {file_upload.id}: {e}")
        
        logger.info(f"Cleanup completed: {stats}")
        return stats
    
    def cleanup_orphaned_storage_files(self):
        """
        Find and delete storage files that don't have database records
        (Advanced feature - be careful with this)
        """
        # This would require listing all storage objects and comparing with DB
        # Left as a placeholder for future implementation
        pass
    
    def notify_expiring_files(self, hours_threshold=24):
        """
        Send email notifications for files that will expire soon
        (Requires Brevo API key - optional feature)
        
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
