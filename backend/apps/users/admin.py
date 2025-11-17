"""
Admin configuration for users app
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'is_active', 'is_premium', 'storage_used', 'created_at']
    list_filter = ['is_active', 'is_premium', 'is_email_verified', 'created_at']
    search_fields = ['email', 'username']
    ordering = ['-created_at']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('VaultShare Info', {
            'fields': ('is_email_verified', 'storage_used', 'storage_quota', 'is_premium')
        }),
    )
