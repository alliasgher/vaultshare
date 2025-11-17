"""
Firebase Storage utility for VaultShare
Provides free, reliable file storage with no egress fees
"""
import logging
import uuid
from datetime import datetime
from django.conf import settings
import firebase_admin
from firebase_admin import credentials, storage

logger = logging.getLogger(__name__)


class FirebaseStorageManager:
    """Manager class for Firebase Storage operations"""
    
    _initialized = False
    _bucket = None
    
    def __init__(self):
        """Initialize Firebase Admin SDK if not already initialized"""
        if not FirebaseStorageManager._initialized:
            try:
                # Initialize Firebase Admin SDK
                if not firebase_admin._apps:
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': settings.FIREBASE_STORAGE_BUCKET
                    })
                
                FirebaseStorageManager._bucket = storage.bucket()
                FirebaseStorageManager._initialized = True
                logger.info("Firebase Storage initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase Storage: {e}")
                raise
    
    def upload_file(self, file_obj, file_path, content_type=None, metadata=None):
        """
        Upload a file to Firebase Storage
        
        Args:
            file_obj: File object to upload
            file_path: Storage path (e.g., 'uploads/user123/file.pdf')
            content_type: MIME type of the file
            metadata: Dictionary of custom metadata
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            blob = self._bucket.blob(file_path)
            
            # Set content type
            if content_type:
                blob.content_type = content_type
            
            # Set custom metadata
            if metadata:
                blob.metadata = metadata
            
            # Upload file
            file_obj.seek(0)  # Reset file pointer
            blob.upload_from_file(file_obj, content_type=content_type)
            
            logger.info(f"Successfully uploaded file to Firebase: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error uploading file to Firebase: {e}")
            return False
    
    def download_file(self, file_path):
        """
        Download a file from Firebase Storage
        
        Args:
            file_path: Storage path of the file
        
        Returns:
            bytes: File content or None if error
        """
        try:
            blob = self._bucket.blob(file_path)
            
            if not blob.exists():
                logger.warning(f"File not found in Firebase Storage: {file_path}")
                return None
            
            content = blob.download_as_bytes()
            logger.info(f"Successfully downloaded file from Firebase: {file_path}")
            return content
            
        except Exception as e:
            logger.error(f"Error downloading file from Firebase: {e}")
            return None
    
    def delete_file(self, file_path):
        """
        Delete a file from Firebase Storage
        
        Args:
            file_path: Storage path of the file to delete
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            blob = self._bucket.blob(file_path)
            
            if blob.exists():
                blob.delete()
                logger.info(f"Successfully deleted file from Firebase: {file_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {file_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting file from Firebase: {e}")
            return False
    
    def check_file_exists(self, file_path):
        """
        Check if a file exists in Firebase Storage
        
        Args:
            file_path: Storage path to check
        
        Returns:
            bool: True if exists, False otherwise
        """
        try:
            blob = self._bucket.blob(file_path)
            return blob.exists()
        except Exception as e:
            logger.error(f"Error checking file existence: {e}")
            return False
    
    def get_file_metadata(self, file_path):
        """
        Get metadata for a file
        
        Args:
            file_path: Storage path of the file
        
        Returns:
            dict: Metadata dictionary or None if error
        """
        try:
            blob = self._bucket.blob(file_path)
            
            if not blob.exists():
                return None
            
            blob.reload()  # Fetch latest metadata
            
            return {
                'name': blob.name,
                'size': blob.size,
                'content_type': blob.content_type,
                'created': blob.time_created,
                'updated': blob.updated,
                'metadata': blob.metadata or {}
            }
        except Exception as e:
            logger.error(f"Error getting file metadata: {e}")
            return None


def generate_firebase_path(user_id, filename):
    """
    Generate a unique Firebase Storage path for file storage
    
    Args:
        user_id: User ID
        filename: Original filename
    
    Returns:
        str: Firebase Storage path
    """
    # Create a unique key with timestamp and UUID
    timestamp = datetime.now().strftime('%Y/%m/%d')
    unique_id = uuid.uuid4().hex
    extension = filename.split('.')[-1] if '.' in filename else ''
    
    if extension:
        path = f"uploads/{user_id}/{timestamp}/{unique_id}.{extension}"
    else:
        path = f"uploads/{user_id}/{timestamp}/{unique_id}"
    
    return path
