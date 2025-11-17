"""
Async tasks for notifications
(Can be run with Celery or as background tasks)
"""
import logging
from apps.files.models import FileUpload
from .services import send_file_accessed_notification

logger = logging.getLogger(__name__)


def send_access_notification(file_id, access_type, ip_address):
    """
    Send notification when file is accessed
    
    This can be made async using Celery or similar task queue
    For now, it runs synchronously but is designed to be async-ready
    """
    try:
        file_upload = FileUpload.objects.get(id=file_id)
        send_file_accessed_notification(file_upload, access_type, ip_address)
    except FileUpload.DoesNotExist:
        logger.error(f"File not found for notification: {file_id}")
    except Exception as e:
        logger.error(f"Error sending access notification: {e}")
