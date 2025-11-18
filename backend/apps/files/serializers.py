"""
Serializers for file upload and access
"""
from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from .models import FileUpload, AccessLog, FileShare
from core.utils import format_file_size


class FileUploadSerializer(serializers.ModelSerializer):
    """Serializer for file upload"""
    file = serializers.FileField(write_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    file_size_formatted = serializers.SerializerMethodField(read_only=True)
    access_url = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = FileUpload
        fields = [
            'id', 'file', 'filename', 'original_filename', 'file_size',
            'file_size_formatted', 'content_type', 'access_token',
            'expiry_hours', 'expires_at', 'max_views', 'current_views',
            'session_duration', 'disable_download', 'require_signin', 
            'max_views_per_consumer', 'password', 'access_url', 'created_at'
        ]
        read_only_fields = [
            'id', 'filename', 'original_filename', 'file_size', 'content_type', 'access_token',
            'expires_at', 'current_views', 'created_at'
        ]

    def get_file_size_formatted(self, obj):
        return format_file_size(obj.file_size)

    def get_access_url(self, obj):
        return obj.get_access_url()

    def validate_file(self, value):
        """Validate file size"""
        from django.conf import settings
        max_size = settings.VAULTSHARE['MAX_FILE_SIZE']
        
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size cannot exceed {format_file_size(max_size)}"
            )
        return value

    def validate_expiry_hours(self, value):
        """Validate expiry hours"""
        from django.conf import settings
        max_hours = settings.VAULTSHARE['MAX_EXPIRY_HOURS']
        
        if value > max_hours:
            raise serializers.ValidationError(
                f"Expiry hours cannot exceed {max_hours}"
            )
        if value < 1:
            raise serializers.ValidationError(
                "Expiry hours must be at least 1"
            )
        return value

    def create(self, validated_data):
        # Extract and hash password if provided
        password = validated_data.pop('password', None)
        if password:
            validated_data['password_hash'] = make_password(password)
        
        # File will be handled in the view
        validated_data.pop('file')
        
        return FileUpload.objects.create(**validated_data)


class FileAccessSerializer(serializers.Serializer):
    """Serializer for file access request"""
    access_token = serializers.CharField(required=True)
    password = serializers.CharField(required=False, allow_blank=True)


class FileDetailSerializer(serializers.ModelSerializer):
    """Serializer for file detail (without sensitive data)"""
    file_size_formatted = serializers.SerializerMethodField()
    time_remaining = serializers.SerializerMethodField()
    views_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = FileUpload
        fields = [
            'id', 'original_filename', 'file_size', 'file_size_formatted',
            'content_type', 'expires_at', 'time_remaining', 'max_views',
            'current_views', 'views_remaining', 'session_duration', 'disable_download',
            'require_signin', 'max_views_per_consumer', 'created_at'
        ]

    def get_file_size_formatted(self, obj):
        return format_file_size(obj.file_size)

    def get_time_remaining(self, obj):
        from django.utils import timezone
        remaining = obj.expires_at - timezone.now()
        if remaining.total_seconds() < 0:
            return "Expired"
        
        hours = int(remaining.total_seconds() // 3600)
        minutes = int((remaining.total_seconds() % 3600) // 60)
        return f"{hours}h {minutes}m"

    def get_views_remaining(self, obj):
        return max(0, obj.max_views - obj.current_views)


class AccessLogSerializer(serializers.ModelSerializer):
    """Serializer for access logs"""
    file_name = serializers.CharField(source='file.original_filename', read_only=True)
    consumer_email = serializers.CharField(source='consumer.email', read_only=True, allow_null=True)
    
    class Meta:
        model = AccessLog
        fields = [
            'id', 'file', 'file_name', 'consumer', 'consumer_email',
            'ip_address', 'user_agent', 'access_granted', 'access_method',
            'failure_reason', 'country', 'city', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FileShareSerializer(serializers.ModelSerializer):
    """Serializer for file sharing"""
    class Meta:
        model = FileShare
        fields = [
            'id', 'file', 'share_method', 'recipient_email',
            'is_notified', 'notified_at', 'created_at'
        ]
        read_only_fields = ['id', 'is_notified', 'notified_at', 'created_at']

    def validate_recipient_email(self, value):
        """Validate email is required for email share method"""
        if self.initial_data.get('share_method') == 'email' and not value:
            raise serializers.ValidationError(
                "Recipient email is required for email sharing"
            )
        return value
