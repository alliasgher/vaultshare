"""
Admin configuration for files app
"""
from django.contrib import admin
from .models import FileUpload, AccessLog, FileShare


@admin.register(FileUpload)
class FileUploadAdmin(admin.ModelAdmin):
    list_display = [
        'original_filename', 'user', 'file_size', 'current_views',
        'max_views', 'expires_at', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'disable_download', 'created_at', 'expires_at']
    search_fields = ['original_filename', 'access_token', 'user__email']
    readonly_fields = ['access_token', 'file_hash', 's3_key', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('File Info', {
            'fields': ('user', 'original_filename', 'file_size', 'content_type', 'file_hash')
        }),
        ('Storage', {
            'fields': ('s3_key', 's3_bucket')
        }),
        ('Access Control', {
            'fields': ('access_token', 'password_hash', 'expiry_hours', 'expires_at')
        }),
        ('Limits', {
            'fields': ('max_views', 'current_views', 'disable_download')
        }),
        ('Status', {
            'fields': ('is_active', 'is_deleted', 'deleted_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = [
        'file', 'ip_address', 'access_granted', 'access_method',
        'failure_reason', 'created_at'
    ]
    list_filter = ['access_granted', 'access_method', 'failure_reason', 'created_at']
    search_fields = ['file__original_filename', 'ip_address']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(FileShare)
class FileShareAdmin(admin.ModelAdmin):
    list_display = [
        'file', 'shared_by', 'share_method', 'recipient_email',
        'is_notified', 'created_at'
    ]
    list_filter = ['share_method', 'is_notified', 'created_at']
    search_fields = ['file__original_filename', 'recipient_email', 'shared_by__email']
    readonly_fields = ['created_at', 'notified_at']
    date_hierarchy = 'created_at'
