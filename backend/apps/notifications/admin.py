"""
Admin configuration for notifications app
"""
from django.contrib import admin
from .models import EmailNotification


@admin.register(EmailNotification)
class EmailNotificationAdmin(admin.ModelAdmin):
    list_display = [
        'recipient', 'subject', 'template_name', 'is_sent',
        'sent_at', 'retry_count', 'created_at'
    ]
    list_filter = ['is_sent', 'template_name', 'created_at']
    search_fields = ['recipient', 'subject', 'message_id']
    readonly_fields = ['created_at', 'sent_at', 'message_id']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Email Info', {
            'fields': ('recipient', 'subject', 'template_name')
        }),
        ('Status', {
            'fields': ('is_sent', 'sent_at', 'message_id')
        }),
        ('Error Tracking', {
            'fields': ('error_message', 'retry_count')
        }),
        ('Context', {
            'fields': ('context_data',),
            'classes': ('collapse',)
        }),
    )
