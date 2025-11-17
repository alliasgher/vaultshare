"""
AWS S3 utility functions for file storage
"""
import boto3
import logging
from django.conf import settings
from botocore.exceptions import ClientError
from botocore.config import Config

logger = logging.getLogger(__name__)


class S3Manager:
    """Manager class for S3 operations"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            config=Config(signature_version=settings.AWS_S3_SIGNATURE_VERSION)
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME

    def upload_file(self, file_obj, s3_key, content_type=None, metadata=None):
        """
        Upload a file to S3
        
        Args:
            file_obj: File object to upload
            s3_key: S3 object key (path)
            content_type: MIME type of the file
            metadata: Dictionary of metadata to attach
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            extra_args = {}
            
            if content_type:
                extra_args['ContentType'] = content_type
            
            if metadata:
                extra_args['Metadata'] = metadata
            
            # Add server-side encryption
            extra_args['ServerSideEncryption'] = 'AES256'
            
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            logger.info(f"Successfully uploaded file to S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error uploading file to S3: {e}")
            return False

    def generate_presigned_url(self, s3_key, expiration=None, download=False, filename=None):
        """
        Generate a presigned URL for S3 object access
        
        Args:
            s3_key: S3 object key
            expiration: Time in seconds for URL to remain valid
            download: If True, force download; if False, display inline
            filename: Custom filename for download
        
        Returns:
            str: Presigned URL or None if error
        """
        if expiration is None:
            expiration = settings.AWS_PRESIGNED_EXPIRATION
        
        try:
            params = {
                'Bucket': self.bucket_name,
                'Key': s3_key,
            }
            
            # Add response parameters for download behavior
            if download or filename:
                response_params = {}
                if download:
                    disposition = 'attachment'
                else:
                    disposition = 'inline'
                
                if filename:
                    disposition += f'; filename="{filename}"'
                
                response_params['ResponseContentDisposition'] = disposition
                params['ResponseContentDisposition'] = disposition
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expiration
            )
            
            return url
            
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None

    def delete_file(self, s3_key):
        """
        Delete a file from S3
        
        Args:
            s3_key: S3 object key to delete
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Successfully deleted file from S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error deleting file from S3: {e}")
            return False

    def check_file_exists(self, s3_key):
        """
        Check if a file exists in S3
        
        Args:
            s3_key: S3 object key to check
        
        Returns:
            bool: True if exists, False otherwise
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError:
            return False

    def get_file_metadata(self, s3_key):
        """
        Get metadata for an S3 object
        
        Args:
            s3_key: S3 object key
        
        Returns:
            dict: Metadata dictionary or None if error
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response.get('Metadata', {})
        except ClientError as e:
            logger.error(f"Error getting file metadata: {e}")
            return None

    def download_file(self, s3_key):
        """
        Download a file from S3 and return its content
        
        Args:
            s3_key: S3 object key to download
        
        Returns:
            bytes: File content or None if error
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            content = response['Body'].read()
            logger.info(f"Successfully downloaded file from S3: {s3_key}")
            return content
            
        except ClientError as e:
            logger.error(f"Error downloading file from S3: {e}")
            return None


def generate_s3_key(user_id, filename):
    """
    Generate a unique S3 key for file storage
    
    Args:
        user_id: User ID
        filename: Original filename
    
    Returns:
        str: S3 key path
    """
    import uuid
    from datetime import datetime
    
    # Create a unique key with timestamp and UUID
    timestamp = datetime.now().strftime('%Y/%m/%d')
    unique_id = uuid.uuid4().hex
    extension = filename.split('.')[-1] if '.' in filename else ''
    
    if extension:
        s3_key = f"uploads/{user_id}/{timestamp}/{unique_id}.{extension}"
    else:
        s3_key = f"uploads/{user_id}/{timestamp}/{unique_id}"
    
    return s3_key
