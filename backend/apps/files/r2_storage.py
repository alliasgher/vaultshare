"""
Cloudflare R2 Storage Manager
Uses S3-compatible API for file operations

R2 Advantages:
- 10 GB free storage (vs Firebase 5 GB)
- Unlimited egress (free downloads!)
- No credit card required
- S3-compatible API
"""

import logging
import boto3
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


class R2StorageManager:
    """
    Cloudflare R2 storage manager using S3-compatible API.
    
    Implements singleton pattern to reuse S3 client.
    """
    
    _instance = None
    _client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize R2 client with Cloudflare credentials."""
        if self._client is None:
            try:
                self._client = boto3.client(
                    's3',
                    endpoint_url=f'https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
                    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                    region_name='auto'  # R2 uses 'auto' region
                )
                logger.info("R2 Storage client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize R2 client: {str(e)}")
                raise
    
    def upload_file(self, file_obj, file_path, content_type=None):
        """
        Upload a file to Cloudflare R2.
        
        Args:
            file_obj: File object or bytes to upload
            file_path: Destination path in R2 bucket (e.g., 'uploads/user123/file.pdf')
            content_type: MIME type of the file (optional)
        
        Returns:
            str: The file path in R2
        
        Raises:
            Exception: If upload fails
        """
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            # Reset file pointer if it's a file object
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)
            
            self._client.upload_fileobj(
                file_obj,
                settings.R2_BUCKET_NAME,
                file_path,
                ExtraArgs=extra_args
            )
            
            logger.info(f"Successfully uploaded file to R2: {file_path}")
            return file_path
            
        except ClientError as e:
            logger.error(f"R2 upload failed for {file_path}: {str(e)}")
            raise Exception(f"Failed to upload file to R2: {str(e)}")
    
    def download_file(self, file_path):
        """
        Download a file from Cloudflare R2.
        
        Args:
            file_path: Path to file in R2 bucket
        
        Returns:
            bytes: File content as bytes
        
        Raises:
            Exception: If download fails
        """
        try:
            response = self._client.get_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=file_path
            )
            
            file_content = response['Body'].read()
            logger.info(f"Successfully downloaded file from R2: {file_path}")
            return file_content
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.error(f"File not found in R2: {file_path}")
                raise FileNotFoundError(f"File not found: {file_path}")
            else:
                logger.error(f"R2 download failed for {file_path}: {str(e)}")
                raise Exception(f"Failed to download file from R2: {str(e)}")
    
    def delete_file(self, file_path):
        """
        Delete a file from Cloudflare R2.
        
        Args:
            file_path: Path to file in R2 bucket
        
        Returns:
            bool: True if deletion successful
        
        Raises:
            Exception: If deletion fails
        """
        try:
            self._client.delete_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=file_path
            )
            
            logger.info(f"Successfully deleted file from R2: {file_path}")
            return True
            
        except ClientError as e:
            logger.error(f"R2 deletion failed for {file_path}: {str(e)}")
            raise Exception(f"Failed to delete file from R2: {str(e)}")
    
    def check_file_exists(self, file_path):
        """
        Check if a file exists in Cloudflare R2.
        
        Args:
            file_path: Path to file in R2 bucket
        
        Returns:
            bool: True if file exists, False otherwise
        """
        try:
            self._client.head_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=file_path
            )
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            else:
                logger.error(f"R2 head_object failed for {file_path}: {str(e)}")
                raise
    
    def get_file_metadata(self, file_path):
        """
        Get metadata for a file in Cloudflare R2.
        
        Args:
            file_path: Path to file in R2 bucket
        
        Returns:
            dict: File metadata (size, content_type, last_modified, etc.)
        
        Raises:
            Exception: If metadata retrieval fails
        """
        try:
            response = self._client.head_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=file_path
            )
            
            return {
                'size': response.get('ContentLength'),
                'content_type': response.get('ContentType'),
                'last_modified': response.get('LastModified'),
                'etag': response.get('ETag'),
            }
            
        except ClientError as e:
            logger.error(f"R2 metadata retrieval failed for {file_path}: {str(e)}")
            raise Exception(f"Failed to get file metadata from R2: {str(e)}")


def generate_r2_path(user_id, filename):
    """
    Generate a unique path for R2 storage.
    
    Format: uploads/{user_id}/{date}/{uuid}.{extension}
    
    Args:
        user_id: User ID
        filename: Original filename
    
    Returns:
        str: Generated R2 path
    """
    from datetime import datetime
    import uuid
    from pathlib import Path
    
    # Get file extension
    ext = Path(filename).suffix
    
    # Generate unique filename with UUID
    unique_filename = f"{uuid.uuid4()}{ext}"
    
    # Create path: uploads/user123/2024-01-15/abc-123.pdf
    date_str = datetime.now().strftime('%Y-%m-%d')
    r2_path = f"uploads/{user_id}/{date_str}/{unique_filename}"
    
    return r2_path
