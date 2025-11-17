"""
Serializers for User model
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    storage_used_formatted = serializers.SerializerMethodField()
    storage_quota_formatted = serializers.SerializerMethodField()
    storage_percentage = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'is_email_verified',
            'storage_used', 'storage_quota', 'storage_used_formatted',
            'storage_quota_formatted', 'storage_percentage',
            'is_premium', 'date_joined', 'last_login'
        ]
        read_only_fields = [
            'id', 'storage_used', 'date_joined', 'last_login'
        ]

    def get_storage_used_formatted(self, obj):
        from core.utils import format_file_size
        return format_file_size(obj.storage_used)

    def get_storage_quota_formatted(self, obj):
        from core.utils import format_file_size
        return format_file_size(obj.storage_quota)

    def get_storage_percentage(self, obj):
        if obj.storage_quota == 0:
            return 0
        return round((obj.storage_used / obj.storage_quota) * 100, 2)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError(
                {"new_password": "Password fields didn't match."}
            )
        return attrs
