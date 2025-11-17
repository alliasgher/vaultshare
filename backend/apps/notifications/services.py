"""
Email service using Brevo (Sendinblue) API
"""
import requests
import logging
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from .models import EmailNotification

logger = logging.getLogger(__name__)


class BrevoEmailService:
    """Service for sending emails via Brevo API"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'BREVO_API_KEY', '')
        self.api_url = "https://api.brevo.com/v3/smtp/email"
        self.from_email = settings.DEFAULT_FROM_EMAIL
        self.from_name = "VaultShare"
        self.enabled = bool(self.api_key)
        
        if not self.enabled:
            logger.warning("Brevo API key not configured - emails will be logged but not sent")

    def send_email(self, to_email, subject, html_content, template_name=None, context=None):
        """
        Send an email using Brevo API
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            template_name: Optional template name for tracking
            context: Optional context data for tracking
        
        Returns:
            tuple: (success: bool, message_id: str or None, error: str or None)
        """
        headers = {
            "accept": "application/json",
            "api-key": self.api_key,
            "content-type": "application/json"
        }
        
        payload = {
            "sender": {
                "name": self.from_name,
                "email": self.from_email
            },
            "to": [
                {
                    "email": to_email
                }
            ],
            "subject": subject,
            "htmlContent": html_content
        }
        
        # Create notification record
        notification = EmailNotification.objects.create(
            recipient=to_email,
            subject=subject,
            template_name=template_name or 'custom',
            context_data=context or {}
        )
        
        # If Brevo not configured, just log and mark as sent
        if not self.enabled:
            logger.info(f"[EMAIL LOG] To: {to_email} | Subject: {subject}")
            logger.debug(f"[EMAIL CONTENT] {html_content[:200]}...")
            notification.is_sent = True
            notification.sent_at = timezone.now()
            notification.message_id = 'local-dev-mode'
            notification.save()
            return True, 'local-dev-mode', None
        
        try:
            response = requests.post(
                self.api_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                message_id = data.get('messageId', '')
                
                # Update notification record
                notification.is_sent = True
                notification.sent_at = timezone.now()
                notification.message_id = message_id
                notification.save()
                
                logger.info(f"Email sent successfully to {to_email}: {message_id}")
                return True, message_id, None
            else:
                error = f"Brevo API error: {response.status_code} - {response.text}"
                notification.error_message = error
                notification.save()
                
                logger.error(error)
                return False, None, error
                
        except Exception as e:
            error = f"Failed to send email: {str(e)}"
            notification.error_message = error
            notification.save()
            
            logger.error(error)
            return False, None, error

    def send_template_email(self, to_email, subject, template_name, context):
        """
        Send an email using a Django template
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            template_name: Template file name (without .html)
            context: Context dictionary for template
        
        Returns:
            tuple: (success: bool, message_id: str or None, error: str or None)
        """
        try:
            # Render HTML template
            html_content = render_to_string(
                f'emails/{template_name}.html',
                context
            )
            
            return self.send_email(
                to_email,
                subject,
                html_content,
                template_name=template_name,
                context=context
            )
            
        except Exception as e:
            error = f"Failed to render template: {str(e)}"
            logger.error(error)
            return False, None, error


def send_file_upload_notification(file_upload):
    """Send notification when a file is uploaded"""
    service = BrevoEmailService()
    
    context = {
        'filename': file_upload.original_filename,
        'access_url': file_upload.get_access_url(),
        'expires_at': file_upload.expires_at,
        'max_views': file_upload.max_views,
    }
    
    return service.send_template_email(
        to_email=file_upload.user.email,
        subject=f'File uploaded: {file_upload.original_filename}',
        template_name='file_uploaded',
        context=context
    )


def send_file_accessed_notification(file_upload, access_type, ip_address):
    """Send notification when a file is accessed"""
    service = BrevoEmailService()
    
    context = {
        'filename': file_upload.original_filename,
        'access_type': access_type,
        'ip_address': ip_address,
        'timestamp': timezone.now(),
        'views_remaining': file_upload.max_views - file_upload.current_views,
    }
    
    return service.send_template_email(
        to_email=file_upload.user.email,
        subject=f'File accessed: {file_upload.original_filename}',
        template_name='file_accessed',
        context=context
    )


def send_file_expiring_notification(file_upload, hours_remaining):
    """Send notification when a file is about to expire"""
    service = BrevoEmailService()
    
    context = {
        'filename': file_upload.original_filename,
        'access_url': file_upload.get_access_url(),
        'hours_remaining': hours_remaining,
        'expires_at': file_upload.expires_at,
    }
    
    return service.send_template_email(
        to_email=file_upload.user.email,
        subject=f'File expiring soon: {file_upload.original_filename}',
        template_name='file_expiring',
        context=context
    )


def send_share_notification(file_share):
    """Send notification to recipient when file is shared"""
    service = BrevoEmailService()
    
    context = {
        'filename': file_share.file.original_filename,
        'access_url': file_share.file.get_access_url(),
        'shared_by': file_share.shared_by.email,
        'expires_at': file_share.file.expires_at,
    }
    
    success, message_id, error = service.send_template_email(
        to_email=file_share.recipient_email,
        subject=f'{file_share.shared_by.email} shared a file with you',
        template_name='file_shared',
        context=context
    )
    
    if success:
        file_share.is_notified = True
        file_share.notified_at = timezone.now()
        file_share.save()
    
    return success, message_id, error
