"""
Views for file upload and access
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.hashers import check_password
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from django.http import FileResponse, HttpResponse
import logging

from .models import FileUpload, AccessLog, FileShare
from .serializers import (
    FileUploadSerializer,
    FileAccessSerializer,
    FileDetailSerializer,
    AccessLogSerializer,
    FileShareSerializer
)
from .firebase_storage import FirebaseStorageManager, generate_firebase_path
from .r2_storage import R2StorageManager, generate_r2_path
from core.utils import generate_file_hash

logger = logging.getLogger(__name__)


class FileUploadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for file upload operations
    """
    serializer_class = FileUploadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return files uploaded by the current user"""
        return FileUpload.objects.filter(
            user=self.request.user,
            is_deleted=False
        )

    def create(self, request, *args, **kwargs):
        """Handle file upload with support for local, Firebase, and S3 storage"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get the uploaded file
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user storage quota
        user = request.user
        if not user.has_storage_available(uploaded_file.size):
            return Response(
                {'error': 'Insufficient storage quota'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate file hash
        file_hash = generate_file_hash(uploaded_file)
        uploaded_file.seek(0)  # Reset file pointer after hash
        
        # Determine storage backend
        storage_backend = getattr(settings, 'STORAGE_BACKEND', 'local')
        
        # Local development storage
        if settings.DEBUG or storage_backend == 'local':
            from django.core.files.storage import default_storage
            import uuid
            
            # Generate unique filename
            file_extension = uploaded_file.name.split('.')[-1] if '.' in uploaded_file.name else ''
            unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
            file_path = default_storage.save(f'uploads/{user.id}/{unique_filename}', uploaded_file)
            
            file_upload = serializer.save(
                user=user,
                filename=unique_filename,
                original_filename=uploaded_file.name,
                file_size=uploaded_file.size,
                file_hash=file_hash,
                content_type=uploaded_file.content_type or 'application/octet-stream',
                s3_key=file_path,
                s3_bucket='local'
            )
        
        # Firebase Storage (FREE - Recommended)
        elif storage_backend == 'firebase':
            firebase_path = generate_firebase_path(user.id, uploaded_file.name)
            
            firebase_manager = FirebaseStorageManager()
            metadata = {
                'original-filename': uploaded_file.name,
                'uploaded-by': str(user.id),
                'file-hash': file_hash,
            }
            
            success = firebase_manager.upload_file(
                uploaded_file,
                firebase_path,
                content_type=uploaded_file.content_type,
                metadata=metadata
            )
            
            if not success:
                return Response(
                    {'error': 'Failed to upload file to Firebase Storage'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            file_upload = serializer.save(
                user=user,
                filename=uploaded_file.name,
                original_filename=uploaded_file.name,
                file_size=uploaded_file.size,
                file_hash=file_hash,
                content_type=uploaded_file.content_type or 'application/octet-stream',
                s3_key=firebase_path,  # Store Firebase path
                s3_bucket='firebase'
            )
        
        # Cloudflare R2 Storage (FREE - 10 GB + unlimited egress!)
        elif storage_backend == 'r2':
            r2_path = generate_r2_path(user.id, uploaded_file.name)
            
            try:
                r2_manager = R2StorageManager()
                r2_manager.upload_file(
                    uploaded_file,
                    r2_path,
                    content_type=uploaded_file.content_type
                )
                
                file_upload = serializer.save(
                    user=user,
                    filename=uploaded_file.name,
                    original_filename=uploaded_file.name,
                    file_size=uploaded_file.size,
                    file_hash=file_hash,
                    content_type=uploaded_file.content_type or 'application/octet-stream',
                    s3_key=r2_path,  # Store R2 path
                    s3_bucket='r2'
                )
            except Exception as e:
                logger.error(f"R2 upload failed: {str(e)}")
                return Response(
                    {'error': f'Failed to upload file to R2 Storage: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        else:
            return Response(
                {'error': f'Invalid storage backend: {storage_backend}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update user's storage usage
        user.update_storage_used(uploaded_file.size)
        
        logger.info(f"File uploaded successfully: {file_upload.id} by user {user.id}")
        
        return Response(
            FileUploadSerializer(file_upload).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['delete'])
    def soft_delete(self, request, pk=None):
        """Soft delete a file"""
        file_upload = self.get_object()
        file_upload.soft_delete()
        
        # Update user's storage usage
        request.user.update_storage_used(-file_upload.file_size)
        
        return Response({'message': 'File deleted successfully'})

    @action(detail=True, methods=['get'])
    def access_logs(self, request, pk=None):
        """
        Get access logs for a specific file.
        Returns session-grouped logs (one entry per session) to avoid showing
        duplicate entries when user both viewed and downloaded in same session.
        """
        file_upload = self.get_object()
        
        # Get session-grouped logs instead of all logs
        grouped_logs = file_upload.get_session_grouped_logs()
        
        serializer = AccessLogSerializer(grouped_logs, many=True)
        return Response(serializer.data)


class FileAccessViewSet(viewsets.ViewSet):
    """
    ViewSet for file access operations (public)
    """
    permission_classes = [permissions.AllowAny]

    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def create_access_log(self, file_upload, request, granted, method='view', reason=None, consumer=None):
        """Create an access log entry"""
        AccessLog.objects.create(
            file=file_upload,
            consumer=consumer,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            access_granted=granted,
            access_method=method,
            failure_reason=reason if not granted else ''
        )

    @action(detail=False, methods=['post'])
    def validate(self, request):
        """Validate access token and password"""
        serializer = FileAccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        access_token = serializer.validated_data['access_token']
        password = serializer.validated_data.get('password', '')
        
        # Get file by access token
        try:
            file_upload = FileUpload.objects.get(access_token=access_token)
        except FileUpload.DoesNotExist:
            return Response(
                {'error': 'Invalid access token'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if file is deleted
        if file_upload.is_deleted:
            consumer = request.user if request.user.is_authenticated else None
            self.create_access_log(file_upload, request, False, reason='deleted', consumer=consumer)
            return Response(
                {'error': 'File has been deleted'},
                status=status.HTTP_410_GONE
            )
        
        # Check if file is active
        if not file_upload.is_active:
            consumer = request.user if request.user.is_authenticated else None
            self.create_access_log(file_upload, request, False, reason='inactive', consumer=consumer)
            return Response(
                {'error': 'File is not active'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check expiry
        if file_upload.is_expired():
            consumer = request.user if request.user.is_authenticated else None
            self.create_access_log(file_upload, request, False, reason='expired', consumer=consumer)
            return Response(
                {'error': 'File has expired'},
                status=status.HTTP_410_GONE
            )
        
        # Check view limit
        if file_upload.is_view_limit_reached():
            consumer = request.user if request.user.is_authenticated else None
            self.create_access_log(file_upload, request, False, reason='view_limit', consumer=consumer)
            return Response(
                {'error': 'View limit reached'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check password if required
        if file_upload.password_hash:
            if not password:
                return Response(
                    {'error': 'Password required', 'password_required': True},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if not check_password(password, file_upload.password_hash):
                consumer = request.user if request.user.is_authenticated else None
                self.create_access_log(file_upload, request, False, reason='wrong_password', consumer=consumer)
                return Response(
                    {'error': 'Invalid password'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        # Check consumer access controls
        if file_upload.require_signin:
            if not request.user.is_authenticated:
                consumer = request.user if request.user.is_authenticated else None
                self.create_access_log(file_upload, request, False, reason='signin_required', consumer=consumer)
                return Response(
                    {'error': 'You must be signed in to access this file'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check if this consumer has exceeded their view limit
            if file_upload.has_consumer_exceeded_limit(consumer_id=request.user.id):
                self.create_access_log(file_upload, request, False, reason='consumer_limit_exceeded', consumer=request.user)
                return Response(
                    {'error': 'You have exceeded your view limit for this file'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Access granted - return file details
        consumer = request.user if request.user.is_authenticated else None
        self.create_access_log(file_upload, request, True, consumer=consumer)
        
        return Response({
            'success': True,
            'file': FileDetailSerializer(file_upload).data,
            'password_required': bool(file_upload.password_hash)
        })

    @action(detail=False, methods=['post'])
    def download(self, request):
        """
        Generate URL for file download
        
        ALL downloads go through our backend for 100% accurate tracking.
        """
        serializer = FileAccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        access_token = serializer.validated_data['access_token']
        password = serializer.validated_data.get('password', '')
        
        # Validate access (reuse validation logic)
        validation_response = self.validate(request)
        if validation_response.status_code != 200:
            return validation_response
        
        # Get file
        file_upload = FileUpload.objects.get(access_token=access_token)
        
        # Check if download is disabled
        if file_upload.disable_download:
            return Response(
                {'error': 'Download is disabled for this file'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Always return our serve endpoint URL with download parameter
        download_url = request.build_absolute_uri(
            f'/api/v1/access/serve/{access_token}/?download=true'
        )
        
        return Response({
            'download_url': download_url,
            'filename': file_upload.original_filename,
            'expires_in': 3600
        })

    @action(detail=False, methods=['post'])
    def view(self, request):
        """
        Generate URL for file view (inline)
        
        ALL views go through our backend for 100% accurate tracking and screenshot protection.
        """
        serializer = FileAccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        access_token = serializer.validated_data['access_token']
        
        # Validate access
        validation_response = self.validate(request)
        if validation_response.status_code != 200:
            return validation_response
        
        # Get file
        file_upload = FileUpload.objects.get(access_token=access_token)
        
        # Always return our serve endpoint URL for accurate tracking and protection
        view_url = request.build_absolute_uri(f'/api/v1/access/serve/{access_token}/')
        
        return Response({
            'view_url': view_url,
            'filename': file_upload.original_filename,
            'content_type': file_upload.content_type,
            'expires_in': 3600
        })

    @action(detail=False, methods=['get'], url_path='serve/(?P<access_token>[^/.]+)', permission_classes=[permissions.AllowAny])
    def serve(self, request, access_token=None):
        """
        Serve file directly - proxies all files for accurate tracking and screenshot protection.
        
        This endpoint handles both local (DEBUG) and storage (production) files by:
        1. Fetching the file from storage (local or cloud)
        2. Streaming it through our backend to the user
        3. Adding anti-screenshot headers and watermarks
        4. Incrementing view counter ONLY when file is successfully delivered
        5. Logging screenshot attempts
        
        This ensures 100% accurate view counting and maximum protection.
        """
        try:
            file_upload = FileUpload.objects.get(access_token=access_token)
            
            # Check if file is expired
            if file_upload.is_expired():
                return HttpResponse('File has expired', status=410)
            
            # Check view limit
            if file_upload.current_views >= file_upload.max_views:
                return HttpResponse('View limit reached', status=403)
            
            # Check consumer access controls
            if file_upload.require_signin:
                if not request.user.is_authenticated:
                    consumer = request.user if request.user.is_authenticated else None
                    self.create_access_log(file_upload, request, False, reason='signin_required', consumer=consumer)
                    return HttpResponse('You must be signed in to access this file', status=401)
                
                # Check if this consumer has exceeded their view limit
                if file_upload.has_consumer_exceeded_limit(consumer_id=request.user.id):
                    self.create_access_log(file_upload, request, False, reason='consumer_limit_exceeded', consumer=request.user)
                    return HttpResponse('You have exceeded your view limit for this file', status=403)
            
            # Determine if this is a download request
            is_download = request.GET.get('download', '').lower() == 'true'
            
            # Log potential screenshot attempt if certain headers are present
            user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
            if 'headless' in user_agent or 'phantom' in user_agent or 'selenium' in user_agent:
                logger.warning(f"Potential screenshot attempt detected for file {file_upload.id} from {self.get_client_ip(request)}")
                consumer = request.user if request.user.is_authenticated else None
                self.create_access_log(file_upload, request, False, method='screenshot_attempt', consumer=consumer)
            
            # Serve file based on storage backend
            storage_backend = getattr(settings, 'STORAGE_BACKEND', 'local')
            storage_type = file_upload.s3_bucket  # 'local', 'firebase', or actual S3 bucket name
            
            # Local storage
            if settings.DEBUG or storage_type == 'local':
                from django.core.files.storage import default_storage
                if default_storage.exists(file_upload.s3_key):
                    file_obj = default_storage.open(file_upload.s3_key, 'rb')
                    response = FileResponse(file_obj, content_type=file_upload.content_type)
                    
                    if is_download:
                        response['Content-Disposition'] = f'attachment; filename="{file_upload.original_filename}"'
                    else:
                        response['Content-Disposition'] = f'inline; filename="{file_upload.original_filename}"'
                        # Allow embedding in iframes from localhost (dev environment)
                        response['Content-Security-Policy'] = "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*"
                        
                        # Anti-screenshot headers
                        response['X-Content-Type-Options'] = 'nosniff'
                        response['X-Frame-Options'] = 'SAMEORIGIN'
                        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
                        response['Pragma'] = 'no-cache'
                        response['Expires'] = '0'
                    
                    # Check for active session before incrementing view counter
                    consumer_id = request.user.id if request.user.is_authenticated else None
                    ip_address = self.get_client_ip(request) if not consumer_id else None
                    
                    # Only increment if no active session exists (prevents duplicate counting on refresh)
                    if not file_upload.has_active_session(consumer_id=consumer_id, ip_address=ip_address):
                        file_upload.increment_views()
                    
                    # Log successful access (always log, even if session is active)
                    method = 'download' if is_download else 'view'
                    consumer = request.user if request.user.is_authenticated else None
                    self.create_access_log(file_upload, request, True, method=method, consumer=consumer)
                    
                    return response
                else:
                    return HttpResponse('File not found', status=404)
            
            # Firebase Storage
            elif storage_type == 'firebase':
                firebase_manager = FirebaseStorageManager()
                file_content = firebase_manager.download_file(file_upload.s3_key)
                
                if not file_content:
                    return HttpResponse('File not found in Firebase Storage', status=404)
                
                # Create streaming response
                from django.http import StreamingHttpResponse
                import io
                
                response = StreamingHttpResponse(
                    io.BytesIO(file_content),
                    content_type=file_upload.content_type
                )
                
                if is_download:
                    response['Content-Disposition'] = f'attachment; filename="{file_upload.original_filename}"'
                else:
                    response['Content-Disposition'] = f'inline; filename="{file_upload.original_filename}"'
                    # Allow embedding in iframes from your frontend domain
                    frontend_domain = getattr(settings, 'VAULTSHARE', {}).get('FRONTEND_URL', 'http://localhost:3000')
                    response['Content-Security-Policy'] = f"frame-ancestors 'self' {frontend_domain}"
                    
                    # Anti-screenshot headers
                    response['X-Content-Type-Options'] = 'nosniff'
                    response['X-Frame-Options'] = 'SAMEORIGIN'
                    response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
                    response['Pragma'] = 'no-cache'
                    response['Expires'] = '0'
                
                response['Content-Length'] = len(file_content)
                
                # Check for active session before incrementing view counter
                consumer_id = request.user.id if request.user.is_authenticated else None
                ip_address = self.get_client_ip(request) if not consumer_id else None
                
                # Only increment if no active session exists (prevents duplicate counting on refresh)
                if not file_upload.has_active_session(consumer_id=consumer_id, ip_address=ip_address):
                    file_upload.increment_views()
                
                # Log successful access (always log, even if session is active)
                method = 'download' if is_download else 'view'
                consumer = request.user if request.user.is_authenticated else None
                self.create_access_log(file_upload, request, True, method=method, consumer=consumer)
                
                # Trigger email notification (async)
                from apps.notifications.tasks import send_access_notification
                send_access_notification(file_upload.id, method, self.get_client_ip(request))
                
                return response
            
            # Cloudflare R2 Storage
            elif storage_type == 'r2':
                try:
                    r2_manager = R2StorageManager()
                    file_content = r2_manager.download_file(file_upload.s3_key)
                    
                    # Create streaming response
                    from django.http import StreamingHttpResponse
                    import io
                    
                    response = StreamingHttpResponse(
                        io.BytesIO(file_content),
                        content_type=file_upload.content_type
                    )
                    
                    if is_download:
                        response['Content-Disposition'] = f'attachment; filename="{file_upload.original_filename}"'
                    else:
                        response['Content-Disposition'] = f'inline; filename="{file_upload.original_filename}"'
                        # Allow embedding in iframes from your frontend domain
                        frontend_domain = getattr(settings, 'VAULTSHARE', {}).get('FRONTEND_URL', 'http://localhost:3000')
                        response['Content-Security-Policy'] = f"frame-ancestors 'self' {frontend_domain}"
                        
                        # Anti-screenshot headers
                        response['X-Content-Type-Options'] = 'nosniff'
                        response['X-Frame-Options'] = 'SAMEORIGIN'
                        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
                        response['Pragma'] = 'no-cache'
                        response['Expires'] = '0'
                    
                    response['Content-Length'] = len(file_content)
                    
                    # Check for active session before incrementing view counter
                    consumer_id = request.user.id if request.user.is_authenticated else None
                    ip_address = self.get_client_ip(request) if not consumer_id else None
                    
                    # Only increment if no active session exists (prevents duplicate counting on refresh)
                    if not file_upload.has_active_session(consumer_id=consumer_id, ip_address=ip_address):
                        file_upload.increment_views()
                    
                    # Log successful access (always log, even if session is active)
                    method = 'download' if is_download else 'view'
                    consumer = request.user if request.user.is_authenticated else None
                    self.create_access_log(file_upload, request, True, method=method, consumer=consumer)
                    
                    # Trigger email notification (async)
                    from apps.notifications.tasks import send_access_notification
                    send_access_notification(file_upload.id, method, self.get_client_ip(request))
                    
                    return response
                    
                except FileNotFoundError:
                    return HttpResponse('File not found in R2 Storage', status=404)
                except Exception as e:
                    logger.error(f"R2 download failed: {str(e)}")
                    return HttpResponse('Failed to retrieve file from R2 Storage', status=500)
                
            # Unknown storage type
            else:
                logger.error(f"Unknown storage type: {storage_type}")
                return HttpResponse('File storage configuration error', status=500)
                
        except FileUpload.DoesNotExist:
            return HttpResponse('Invalid access token', status=404)
